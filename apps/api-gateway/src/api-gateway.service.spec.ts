import { Test, TestingModule } from '@nestjs/testing';

import { ApiGatewayService } from './api-gateway.service';

describe('ApiGatewayService', () => {
  let service: ApiGatewayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApiGatewayService],
    }).compile();

    service = module.get<ApiGatewayService>(ApiGatewayService);
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
