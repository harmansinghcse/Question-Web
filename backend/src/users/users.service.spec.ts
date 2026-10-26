import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User, UserRole, AccountStatus } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  const mockFindOne = jest.fn();
  const mockCreate = jest.fn();
  const mockSave = jest.fn();

  const mockUser: User = {
    userId: 1,
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    displayName: 'Test User',
    role: UserRole.STUDENT,
    accountStatus: AccountStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockFindOne.mockReset();
    mockCreate.mockReset();
    mockSave.mockReset();

    const mockRepo = {
      findOne: mockFindOne,
      create: mockCreate,
      save: mockSave,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should normalize email to lowercase and trimmed before searching', async () => {
      mockFindOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('  TEST@Example.com  ');

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user is not found', async () => {
      mockFindOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by userId', async () => {
      mockFindOne.mockResolvedValue(mockUser);

      const result = await service.findById(1);

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('create', () => {
    it('should create and save a new user with default STUDENT role and ACTIVE status', async () => {
      mockCreate.mockImplementation((entity) => entity as User);
      mockSave.mockResolvedValue(mockUser);

      const result = await service.create({
        email: '  NewUser@example.COM ',
        passwordHash: 'hashed_secret',
        displayName: '  New User  ',
      });

      expect(mockCreate).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        passwordHash: 'hashed_secret',
        displayName: 'New User',
        role: UserRole.STUDENT,
        accountStatus: AccountStatus.ACTIVE,
      });
      expect(mockSave).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });
  });
});
