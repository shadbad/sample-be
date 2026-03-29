import { Test, TestingModule } from '@nestjs/testing';

import { UserServiceService } from './user-service.service';

describe('UserServiceService', () => {
  let service: UserServiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserServiceService],
    }).compile();

    service = module.get<UserServiceService>(UserServiceService);
  });

  it('given the service is instantiated, when it is referenced, then it is defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHello', () => {
    it('given no input, when getHello is called, then it returns the greeting string', () => {
      expect(service.getHello()).toBe('Hello World!');
    });
  });
});
