import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// 절대 경로 사용 예시:
// import { Public } from 'src/common/decorators/public.decorator';

/* eslint-disable @typescript-eslint/unbound-method */
describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getVersion: jest.fn().mockReturnValue('0.0.1'),
            purgeCache: jest.fn().mockResolvedValue(1),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('version', () => {
    it('should return version object', () => {
      expect(appController.version()).toEqual({ version: '0.0.1' });
      expect(appService.getVersion).toHaveBeenCalled();
    });
  });

  describe('purgeCache', () => {
    it('should purge cache', async () => {
      await expect(appController.purgeCache()).resolves.toBeUndefined();
      expect(appService.purgeCache).toHaveBeenCalled();
    });
  });
});
