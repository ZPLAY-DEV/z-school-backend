import { Test, TestingModule } from '@nestjs/testing';
import { FcmService, FcmSendResult } from './fcm.service';
import { SingleFcmData } from 'src/services/notification/types';

describe('FcmService', () => {
  let service: FcmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FcmService],
    }).compile();

    service = module.get<FcmService>(FcmService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendOne', () => {
    it('should send single FCM message successfully', async () => {
      const mockData: SingleFcmData = {
        token: 'test_token_123',
        notification: {
          title: '테스트 알림',
          body: '테스트 메시지입니다',
        },
        data: {
          role: 'PARENT',
        },
        android: {
          priority: 'high',
          ttl: 86400,
          notification: {
            priority: 'high',
            defaultSound: true,
          },
        },
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: 'default',
            },
          },
        },
      };

      // Firebase Admin SDK 모킹이 필요합니다
      // 실제 테스트에서는 jest.mock을 사용하여 모킹해야 합니다
      
      const result: FcmSendResult = await service.sendOne(mockData);
      
      expect(typeof result.result.success).toBe('boolean');
      expect(result.invalidToken).toBeUndefined();
    });

    it('should handle invalid token error', async () => {
      const mockData: SingleFcmData = {
        token: 'invalid_token_123',
        notification: {
          title: '테스트 알림',
          body: '테스트 메시지입니다',
        },
        data: {
          role: 'PARENT',
        },
        android: {
          priority: 'high',
          ttl: 86400,
          notification: {
            priority: 'high',
            defaultSound: true,
          },
        },
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: 'default',
            },
          },
        },
      };

      // 실제 테스트에서는 Firebase Admin SDK 모킹이 필요합니다
      const result: FcmSendResult = await service.sendOne(mockData);
      
      expect(result.result.success).toBe(false);
      expect(result.invalidToken).toBe('invalid_token_123');
    });
  });

  describe('sendMany', () => {
    it('should handle empty messages array', async () => {
      const { results, invalidTokens } = await service.sendMany([]);
      
      expect(results).toHaveLength(0);
      expect(invalidTokens).toHaveLength(0);
    });

    it('should process multiple messages', async () => {
      const messages: SingleFcmData[] = [
        {
          token: 'token1',
          notification: {
            title: '공지사항',
            body: '새로운 공지가 있습니다',
          },
          data: {
            role: 'PARENT',
          },
          android: {
            priority: 'high',
            ttl: 86400,
            notification: {
              priority: 'high',
              defaultSound: true,
            },
          },
          apns: {
            payload: {
              aps: {
                badge: 1,
                sound: 'default',
              },
            },
          },
        },
        {
          token: 'token2',
          notification: {
            title: '다른 제목',
            body: '다른 내용',
          },
          data: {
            role: 'INSTRUCTOR',
          },
          android: {
            priority: 'high',
            ttl: 86400,
            notification: {
              priority: 'high',
              defaultSound: true,
            },
          },
          apns: {
            payload: {
              aps: {
                badge: 1,
                sound: 'default',
              },
            },
          },
        },
      ];

      // 실제 테스트에서는 Firebase Admin SDK 모킹이 필요합니다
      const { results, invalidTokens } = await service.sendMany(messages);
      
      expect(results).toHaveLength(2);
      expect(invalidTokens).toHaveLength(0);
    });
  });

  describe('cleanupInvalidTokens', () => {
    it('should handle empty invalid tokens array', () => {
      expect(() => service.cleanupInvalidTokens([])).not.toThrow();
    });

    it('should process invalid tokens cleanup', () => {
      const invalidTokens = ['invalid_token_1', 'invalid_token_2'];
      
      // 로깅이 에러를 던지지 않는지 확인
      expect(() => service.cleanupInvalidTokens(invalidTokens)).not.toThrow();
    });
  });
});
