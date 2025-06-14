import { Injectable, Logger } from '@nestjs/common';
import { PickRule } from 'src/common/enums';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import {
  DataSource,
  EntityManager,
  EntitySubscriberInterface,
  UpdateEvent,
} from 'typeorm';

@Injectable()
export class OfferingSubscriber implements EntitySubscriberInterface<Offering> {
  private readonly logger = new Logger(OfferingSubscriber.name);

  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo(): any {
    return Offering;
  }

  async afterUpdate(event: UpdateEvent<Offering>) {
    const offering = event.entity as Offering;
    // const prev = event.databaseEntity;

    if (offering.pickRule !== PickRule.FORMER) return;

    try {
      const termId = await this.findImmediatelyPreviousTermId(
        offering.id,
        event.manager,
      );

      // Check if required fields are available
      if (!offering.lessonName || !offering.schoolId) {
        this.logger.warn(
          `Missing lessonName or schoolId for offering ${offering.id}`,
        );
        return;
      }

      const lesson = await this.findSameLessonInPreviousTerm(
        termId,
        offering.lessonName,
        offering.schoolId,
        event.manager,
      );

      if (lesson) {
        const formerStudentIds = await this.findFormerStudentIds(
          lesson,
          event.manager,
        );

        // Update the offering with former student IDs directly
        offering.formerStudentIds = formerStudentIds;
        await event.manager.save(Offering, offering);

        this.logger.log(
          `Updated offering ${offering.id} with ${formerStudentIds.length} former students`,
        );
      } else {
        this.logger.log(
          `No matching lesson found in previous term for offering ${offering.id}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error processing offering update: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Find the immediately previous term ID for the given offering
   */
  private async findImmediatelyPreviousTermId(
    offeringId: number,
    manager: EntityManager,
  ): Promise<number> {
    const offering = await manager.findOneOrFail(Offering, {
      where: { id: offeringId },
      relations: ['term', 'term.school', 'term.school.terms'],
    });

    const { term } = offering;
    if (!term || !term.school || !term.school.terms) {
      throw new Error('Term or school information not found');
    }

    // Find the direct previous term based on dates
    // Sort terms by start date in descending order
    const sortedTerms = [...term.school.terms]
      .filter((t) => t.id !== term.id) // Exclude current term
      .sort((a, b) => {
        const aStartDate = new Date(a.start);
        const bStartDate = new Date(b.start);
        return bStartDate.getTime() - aStartDate.getTime(); // Descending
      });

    // Find the term that starts most recently before the current term starts
    const currentTermStart = new Date(term.start);
    const previousTerm = sortedTerms.find((t) => {
      const termStartDate = new Date(t.start);
      return termStartDate < currentTermStart;
    });

    if (!previousTerm) {
      throw new Error('No previous term found');
    }

    return previousTerm.id;
  }

  /**
   * Find the same lesson in the specified term
   */
  private async findSameLessonInPreviousTerm(
    termId: number,
    lessonName: string,
    schoolId: number,
    manager: EntityManager,
  ): Promise<Lesson | null> {
    try {
      const lesson = await manager.findOne(Lesson, {
        where: {
          termId,
          lessonName,
          schoolId,
        },
        relations: ['groups'],
      });

      return lesson;
    } catch (error) {
      this.logger.error(
        `Error finding lesson in term ${termId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Find former student IDs who took this lesson
   */
  private async findFormerStudentIds(
    lesson: Lesson,
    manager: EntityManager,
  ): Promise<number[]> {
    try {
      if (!lesson.groups || lesson.groups.length === 0) {
        return [];
      }

      const groupIds = lesson.groups.map((group) => group.id);

      // Query to find students who took this lesson
      const query = `
        SELECT DISTINCT p.studentId
        FROM picks p
        WHERE p.groupId IN (${groupIds.join(',')})
        AND p.deletedAt IS NULL
      `;

      const result: { studentId: number }[] = await manager.query(query);

      return result.map((row) => row.studentId);
    } catch (error) {
      this.logger.error(`Error finding former student IDs: ${error.message}`);
      return [];
    }
  }
}
