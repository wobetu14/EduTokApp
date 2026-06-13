import * as Linking from 'expo-linking';
import { SHARE_HOST } from '../utils/apiConfig';

// Deep-link routing for shared course/lesson links. Both the https universal /
// App Link form (detectable + tappable in chat apps) and the raw scheme work:
//   https://edutok.app/course/<courseId>   ·  edutok://course/<courseId>
//   https://edutok.app/lesson/<lessonId>?courseId=<courseId>
//
// CourseProfile / LessonPlayback live in every tab stack; we route incoming
// links through the Explore tab (the discovery surface). The `:courseId` /
// `:lessonId` path segments and the `?courseId=` query string map straight
// onto each screen's route params, which is exactly what CourseProfileScreen
// and LessonPlaybackScreen already read.
const linking = {
  prefixes: [
    Linking.createURL('/'),
    'edutok://',
    `https://${SHARE_HOST}`,
    `https://www.${SHARE_HOST}`,
  ],
  config: {
    screens: {
      Explore: {
        // Seed the stack with ExploreHome so "back" from a deep-linked screen
        // returns to Explore rather than closing the app.
        initialRouteName: 'ExploreHome',
        screens: {
          ExploreHome: 'explore',
          CourseProfile: 'course/:courseId',
          LessonPlayback: 'lesson/:lessonId',
        },
      },
      ForYou: { screens: { ForYouHome: '' } },
      Search: { screens: { SearchHome: 'search' } },
      Profile: { screens: { ProfileHome: 'profile' } },
    },
  },
};

export default linking;
