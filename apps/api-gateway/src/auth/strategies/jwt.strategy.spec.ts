import { createMock } from '@golevelup/ts-jest';
import { ConfigService } from '@nestjs/config';

import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    const config = createMock<ConfigService>({
      getOrThrow: jest.fn().mockReturnValue('test-secret'),
    });
    strategy = new JwtStrategy(config);
  });

  describe('validate', () => {
    it('given a valid JWT payload, when validate is called, then it maps sub to userId', () => {
      const payload = { sub: 'user-uuid-123', email: 'user@example.com' };

      const result = strategy.validate(payload);

      expect(result).toEqual({ userId: 'user-uuid-123', email: 'user@example.com' });
    });

    it('given a payload with different sub value, when validate is called, then userId reflects sub', () => {
      const payload = { sub: 'another-uuid', email: 'other@example.com' };

      const result = strategy.validate(payload);

      expect(result.userId).toBe('another-uuid');
      expect(result.email).toBe('other@example.com');
    });
  });
});
