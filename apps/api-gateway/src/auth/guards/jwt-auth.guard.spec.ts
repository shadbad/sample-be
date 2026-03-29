import { createMock } from '@golevelup/ts-jest';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = createMock<Reflector>();
    guard = new JwtAuthGuard(reflector);
  });

  describe('canActivate', () => {
    it('given a route decorated with @Public(), when canActivate is called, then it returns true without invoking PassportAuthGuard', () => {
      const context = createMock<ExecutionContext>();
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: unknown) => key === IS_PUBLIC_KEY);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('given a protected route, when canActivate is called, then it delegates to PassportAuthGuard', () => {
      const context = createMock<ExecutionContext>();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const superSpy = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      void guard.canActivate(context);

      expect(superSpy).toHaveBeenCalledWith(context);
    });
  });
});
