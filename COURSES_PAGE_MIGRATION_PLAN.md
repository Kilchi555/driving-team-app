# pages/admin/courses.vue - Migration Plan

## Analysis

**File Size:** 6700+ lines  
**Tabs:** 3 (Courses, Categories, Resources)  
**Functions with DB Queries:** 17  
**Total Queries:** 32

## Functions to Migrate

### TAB 1: Courses (7 functions)
1. `loadCourses()` - Load course list
2. `loadStaff()` - Load available staff
3. `createCourse()` - Create new course
4. `loadCourseSessions()` - Load sessions for course
5. `loadCourseParticipants()` - Load course participants
6. `loadCourseEnrollments()` - Load enrollments
7. `loadDeletedEnrollments()` - Load deleted enrollments

### TAB 2: Categories (4 functions)
1. `saveCategory()` - Create/update category
2. `deleteCategoryItem()` - Delete category

### TAB 3: Resources (6 functions)
1. `createVehicle()` - Create vehicle
2. `updateVehicle()` - Update vehicle
3. `deleteVehicle()` - Delete vehicle
4. `createRoom()` - Create room
5. `updateRoom()` - Update room
6. `deleteRoom()` - Delete room

### Other (2 functions)
1. `saveGeneralResource()` - General resource
2. `createExternalInstructor()` - External instructor

---

## Required APIs

### Group 1: Course Management
- `/api/admin/courses/list.post.ts` - List all courses
- `/api/admin/courses/create.post.ts` - Create course
- `/api/admin/courses/sessions.post.ts` - Get sessions
- `/api/admin/courses/participants.post.ts` - Get participants
- `/api/admin/courses/enrollments.post.ts` - Get enrollments

### Group 2: Category Management
- `/api/admin/course-categories/save.post.ts` - Create/update category
- `/api/admin/course-categories/delete.post.ts` - Delete category

### Group 3: Resource Management (Vehicles & Rooms)
- `/api/admin/resources/vehicles/create.post.ts` - Create vehicle
- `/api/admin/resources/vehicles/update.post.ts` - Update vehicle
- `/api/admin/resources/vehicles/delete.post.ts` - Delete vehicle
- `/api/admin/resources/rooms/create.post.ts` - Create room
- `/api/admin/resources/rooms/update.post.ts` - Update room
- `/api/admin/resources/rooms/delete.post.ts` - Delete room

### Group 4: Misc
- `/api/admin/staff/list.post.ts` - List staff
- `/api/admin/resources/general-save.post.ts` - Save general resource
- `/api/admin/instructors/create-external.post.ts` - Create external instructor

---

## Migration Strategy

**Phase 1 (Today):** Create all 14 APIs
**Phase 2:** Update pages/admin/courses.vue to use new APIs
**Phase 3:** Test and verify

---

## Estimated Effort
- **API Creation:** ~2 hours (copy patterns from dashboard APIs)
- **Page Migration:** ~1 hour
- **Testing:** ~30 minutes
- **Total:** ~3.5 hours


