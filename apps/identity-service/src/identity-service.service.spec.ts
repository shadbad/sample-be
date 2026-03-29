import { Test, TestingModule } from '@nestjs/testing';

import { IdentityServiceService } from './identity-service.service';

describe('IdentityServiceService', () => {
  let service: IdentityServiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IdentityServiceService],
    }).compile();

    service = module.get<IdentityServiceService>(IdentityServiceService);
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
