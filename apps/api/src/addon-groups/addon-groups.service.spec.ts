import { Test, TestingModule } from '@nestjs/testing';
import { AddonGroupsService } from './addon-groups.service';

describe('AddonGroupsService', () => {
  let service: AddonGroupsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AddonGroupsService],
    }).compile();

    service = module.get<AddonGroupsService>(AddonGroupsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
