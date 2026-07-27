import { CurrentUserDecorator } from './current-user.decorator';

describe('CurrentUserDecorator', () => {
  it('should be defined', () => {
    expect(new CurrentUserDecorator()).toBeDefined();
  });
});
