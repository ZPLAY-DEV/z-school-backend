import { InternalServerErrorException, Logger } from '@nestjs/common';

interface BatchPutOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  logger?: Logger;
}

export async function batchPutHelper<T>(
  model: any,
  items: T[],
  options: BatchPutOptions = {},
): Promise<void> {
  const {
    maxRetries = 5,
    baseDelayMs = 100,
    maxDelayMs = 1000,
    logger = new Logger('BatchPutHelper'),
  } = options;

  /**
   * 청크 분할 (최대 25개 항목, 16MB 제한, Delay 처리)
   * @see - https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/dynamodb/command/BatchWriteItemCommand/
   * */
  const chunkArrayWithSizeLimit = <U>(
    array: U[],
    maxSize: number,
    maxBytes: number,
  ): U[][] => {
    const result: U[][] = [];
    let currentChunk: U[] = [];
    let currentSize = 0;

    for (const item of array) {
      const itemSize = Buffer.from(JSON.stringify(item)).length;
      if (currentChunk.length >= maxSize || currentSize + itemSize > maxBytes) {
        result.push(currentChunk);
        currentChunk = [item];
        currentSize = itemSize;
      } else {
        currentChunk.push(item);
        currentSize += itemSize;
      }
    }
    if (currentChunk.length > 0) {
      result.push(currentChunk);
    }
    return result;
  };

  // 단일 청크 처리
  const processChunk = async (
    chunk: T[],
    chunkIndex: number,
  ): Promise<void> => {
    let itemsToProcess = chunk;
    let retryCount = 0;

    while (itemsToProcess.length > 0 && retryCount < maxRetries) {
      try {
        const start = Date.now();
        const response = await model.batchPut(itemsToProcess);
        logger.log(
          `Chunk ${chunkIndex + 1} processed in ${Date.now() - start}ms`,
        );

        if (response.unprocessedItems && response.unprocessedItems.length > 0) {
          itemsToProcess = response.unprocessedItems;
          retryCount++;
          const delay = Math.min(
            baseDelayMs * Math.pow(2, retryCount),
            maxDelayMs,
          );
          logger.warn(
            `Unprocessed items in chunk ${chunkIndex + 1}, retrying (${retryCount}/${maxRetries}): ${itemsToProcess.length} items, delay: ${delay}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          itemsToProcess = [];
        }
      } catch (error) {
        logger.error(`BatchPut failed for chunk ${chunkIndex + 1}: ${error}`);
        if (retryCount + 1 === maxRetries) {
          throw new InternalServerErrorException(
            `Failed to process chunk ${chunkIndex + 1} after ${maxRetries} retries`,
          );
        }
        retryCount++;
        const delay = Math.min(
          baseDelayMs * Math.pow(2, retryCount),
          maxDelayMs,
        );
        logger.warn(
          `Retrying chunk ${chunkIndex + 1} (${retryCount}/${maxRetries}), delay: ${delay}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    if (itemsToProcess.length > 0) {
      throw new InternalServerErrorException(
        `Failed to process all items in chunk ${chunkIndex + 1} after ${maxRetries} retries`,
      );
    }
  };

  // 청크 분할 (최대 25개, 16MB)
  const BATCH_SIZE = 25;
  const MAX_BYTES = 16 * 1024 * 1024; // 16MB
  const chunks = chunkArrayWithSizeLimit(items, BATCH_SIZE, MAX_BYTES);

  // 병렬 처리
  try {
    await Promise.all(
      chunks.map(async (chunk, index) => {
        logger.log(
          `Processing chunk ${index + 1}/${chunks.length} with ${chunk.length} items`,
        );
        await processChunk(chunk, index);
      }),
    );
    logger.log(
      `Successfully processed ${items.length} items in ${chunks.length} chunks`,
    );
  } catch (error) {
    logger.error(`Failed to process batchPut: ${error}`);
    throw new InternalServerErrorException(
      'Failed to process batchPut operation',
    );
  }
}
