import type {
  ContentContainer,
  ContentContainerRepository,
  CourseContainerAssignmentRepository,
  CourseInstanceRepository,
  CourseMemberRepository,
  CourseMemberRole
} from '../../domain/src/index.ts';

export class CourseVisibilityService {
  private readonly deps: {
    contentContainerRepository: ContentContainerRepository;
    courseInstanceRepository: CourseInstanceRepository;
    courseMemberRepository: CourseMemberRepository;
    courseContainerAssignmentRepository: CourseContainerAssignmentRepository;
  };

  constructor(deps: {
    contentContainerRepository: ContentContainerRepository;
    courseInstanceRepository: CourseInstanceRepository;
    courseMemberRepository: CourseMemberRepository;
    courseContainerAssignmentRepository: CourseContainerAssignmentRepository;
  }) {
    this.deps = deps;
  }

  async listVisibleCourseTiles(userId: string, roleInCourse: CourseMemberRole): Promise<Array<{
    courseInstanceId: string;
    contentContainer: ContentContainer;
  }>> {
    const memberships = (await this.deps.courseMemberRepository.listByUser(userId))
      .filter((member) => member.status === 'active' && member.roleInCourse === roleInCourse);
    const visible: Array<{ courseInstanceId: string; contentContainer: ContentContainer }> = [];

    for (const membership of memberships) {
      const course = await this.deps.courseInstanceRepository.getById(membership.courseInstanceId);
      if (!course || course.status !== 'active') {
        continue;
      }
      const assignments = (await this.deps.courseContainerAssignmentRepository.listByCourseInstance(course.id))
        .filter((assignment) => assignment.status === 'active');
      for (const assignment of assignments) {
        const container = await this.deps.contentContainerRepository.getById(assignment.contentContainerId);
        if (container && container.status === 'active' && container.assignable && container.category !== 'admin') {
          visible.push({
            courseInstanceId: course.id,
            contentContainer: container
          });
        }
      }
    }

    return visible;
  }
}
