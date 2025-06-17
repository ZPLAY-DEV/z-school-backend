s3service 사용법

// Buffer 방식 (기존 호환)
const buffer = Buffer.from('file content');
await s3Service.upload(buffer, 'path/file.txt', 'text/plain');

// 스트림 방식 (새로운 방식)
const fileStream = fs.createReadStream('large-file.pdf');
await s3Service.upload(fileStream, 'documents/large-file.pdf', 'application/pdf');
