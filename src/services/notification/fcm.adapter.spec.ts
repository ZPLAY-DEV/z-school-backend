import { FcmAdapter } from './fcm.adapter';
import { NotificationCoreData } from './types';

describe('FcmAdapter', () => {
  describe('toPayload', () => {
    it('should convert NotificationCoreData to SingleFcmData', () => {
      const mockData: NotificationCoreData = {
        token: 'test_token_123',
        phone: '01012345678',
        template: 'test_template',
        title: '테스트 제목',
        body: '테스트 내용입니다',
        role: 'PARENT',
        url: '/test',
        routes: { page: 'test' },
      };

      const result = FcmAdapter.toPayload(mockData);

      expect(result.token).toBe('test_token_123');
      expect(result.notification.title).toBe('테스트 제목');
      expect(result.notification.body).toBe('테스트 내용입니다');
      expect(result.data.role).toBe('PARENT');
      expect(result.data.url).toBe('/test');
      expect(result.data.routes).toBe('{"page":"test"}');
      expect(result.android.priority).toBe('high');
      expect(result.apns.payload.aps.badge).toBe(1);
    });

    it('should use body first line as title when title is not provided', () => {
      const mockData: NotificationCoreData = {
        token: 'test_token_123',
        phone: '01012345678',
        template: 'test_template',
        body: '첫 번째 줄\n두 번째 줄\n세 번째 줄',
        role: 'PARENT',
      };

      const result = FcmAdapter.toPayload(mockData);

      expect(result.notification.title).toBe('첫 번째 줄');
      expect(result.notification.body).toBe('첫 번째 줄\n두 번째 줄\n세 번째 줄');
    });

    it('should use default title when title and body are not provided', () => {
      const mockData: NotificationCoreData = {
        token: 'test_token_123',
        phone: '01012345678',
        template: 'test_template',
        body: '',
        role: 'PARENT',
      };

      const result = FcmAdapter.toPayload(mockData);

      expect(result.notification.title).toBe('n/a');
      expect(result.notification.body).toBe('');
    });
  });

  describe('toPayloadArray', () => {
    it('should convert array of NotificationCoreData to SingleFcmData array', () => {
      const mockMessages: NotificationCoreData[] = [
        {
          token: 'token1',
          phone: '01012345678',
          template: 'template1',
          title: '제목1',
          body: '내용1',
          role: 'PARENT',
        },
        {
          token: 'token2',
          phone: '01087654321',
          template: 'template2',
          title: '제목2',
          body: '내용2',
          role: 'INSTRUCTOR',
        },
      ];

      const results = FcmAdapter.toPayloadArray(mockMessages);

      expect(results).toHaveLength(2);
      expect(results[0].token).toBe('token1');
      expect(results[0].notification.title).toBe('제목1');
      expect(results[1].token).toBe('token2');
      expect(results[1].notification.title).toBe('제목2');
    });

    it('should handle empty array', () => {
      const results = FcmAdapter.toPayloadArray([]);

      expect(results).toHaveLength(0);
    });

    it('should handle single message array', () => {
      const mockMessages: NotificationCoreData[] = [
        {
          token: 'single_token',
          phone: '01012345678',
          template: 'single_template',
          title: '단일 제목',
          body: '단일 내용',
          role: 'PARENT',
        },
      ];

      const results = FcmAdapter.toPayloadArray(mockMessages);

      expect(results).toHaveLength(1);
      expect(results[0].token).toBe('single_token');
      expect(results[0].notification.title).toBe('단일 제목');
    });
  });
});
