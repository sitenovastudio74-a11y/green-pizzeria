import { Test, TestingModule } from '@nestjs/testing';
import { AddonGroupsController } from './addon-groups.controller';

describe('AddonGroupsController', () => {
  let controller: AddonGroupsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddonGroupsController],
    }).compile();

    controller = module.get<AddonGroupsController>(AddonGroupsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
