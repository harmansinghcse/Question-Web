import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { DEPARTMENT_CODE_ALIASES } from '../common/student-profile.util';

const DEPT_CODE_NAME_KEYWORDS: Record<string, string[]> = {
  CS: ['computer', 'computing', 'cse'],
  AI: ['artificial intelligence', 'data science', 'ai'],
  EC: ['electronics', 'ece', 'communication'],
  EE: ['electrical'],
  ME: ['mechanical'],
  CE: ['civil'],
  CH: ['chemical'],
};

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly repository: Repository<Department>,
  ) {}

  findAll(): Promise<Department[]> {
    return this.repository.find({ order: { deptName: 'ASC' } });
  }

  async findById(deptId: number): Promise<Department | null> {
    return this.repository.findOneBy({ deptId });
  }

  /**
   * Resolves a Department record from an email department code or alias.
   * Compares against actual Department records in MySQL.
   */
  async resolveDepartmentByCode(
    codeOrAlias: string,
  ): Promise<Department | null> {
    if (!codeOrAlias) return null;
    const normalized = codeOrAlias.trim().toUpperCase();
    const standardCode = DEPARTMENT_CODE_ALIASES[normalized] ?? normalized;

    const allDepts = await this.findAll();
    if (allDepts.length === 0) return null;

    // 1. Direct name match or starts with code
    const exactMatch = allDepts.find(
      (d) =>
        d.deptName.trim().toUpperCase() === standardCode ||
        d.deptName.trim().toUpperCase().startsWith(`${standardCode} `),
    );
    if (exactMatch) return exactMatch;

    // 2. Keyword mapping match
    const keywords = DEPT_CODE_NAME_KEYWORDS[standardCode] || [
      standardCode.toLowerCase(),
    ];
    for (const d of allDepts) {
      const lower = d.deptName.toLowerCase();
      if (keywords.some((kw) => lower.includes(kw))) {
        return d;
      }
    }

    return null;
  }

  /**
   * Resolves a department directly from an institutional email address.
   */
  async resolveFromEmail(email?: string | null): Promise<Department | null> {
    if (!email) return null;
    const match = email.trim().match(/^[uU]\d{2}([a-zA-Z]{2,4})/);
    if (!match) return null;
    return this.resolveDepartmentByCode(match[1]);
  }
}
