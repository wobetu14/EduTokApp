// Seed data for EduTok (AsyncStorage-backed mock backend)

const engagementCounts = (id) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  h = Math.abs(h);
  return {
    likesCount: (h % 8000) + 2000,
    savesCount: Math.floor(((h % 8000) + 2000) * 0.38),
    commentsCount: (h % 300) + 30,
    sharesCount: (h % 1000) + 100,
  };
};

export const ORGANIZATIONS = [
  {
    id: 'org1',
    name: 'TechLearn Academy',
    logo: 'https://picsum.photos/seed/techlearn/200/200',
    description:
      'Empowering the next generation of technologists with bite-sized engineering and AI lessons.',
    courseCount: 3,
    tags: ['Engineering', 'AI', 'Digital'],
  },
  {
    id: 'org2',
    name: 'MathMind Institute',
    logo: 'https://picsum.photos/seed/mathmind/200/200',
    description:
      'Making mathematics and psychology accessible for everyone, one 3-minute lesson at a time.',
    courseCount: 2,
    tags: ['Math', 'Psychology'],
  },
  {
    id: 'org3',
    name: 'BizBoost School',
    logo: 'https://picsum.photos/seed/bizboost/200/200',
    description:
      'Practical business, finance, and digital marketing knowledge for ambitious learners.',
    courseCount: 3,
    tags: ['Business', 'Finance', 'Digital'],
  },
];

export const COURSES = [
  {
    id: 'course1',
    organizationId: 'org1',
    title: 'Python Fundamentals',
    thumbnail: 'https://picsum.photos/seed/python/400/300',
    description:
      'Master the basics of Python programming through short, focused lessons. Perfect for beginners.',
    category: 'engineering',
    tags: ['python', 'programming', 'coding', 'beginners'],
    lessonIds: ['l1', 'l2', 'l3', 'l4'],
    enrolledCount: 12400,
    likesCount: 3200,
    difficulty: 'Beginner',
    totalDuration: 540,
  },
  {
    id: 'course2',
    organizationId: 'org1',
    title: 'Web Development Basics',
    thumbnail: 'https://picsum.photos/seed/webdev/400/300',
    description:
      'Learn HTML, CSS, and JavaScript fundamentals with visual, hands-on mini-lessons.',
    category: 'digital',
    tags: ['html', 'css', 'javascript', 'web'],
    lessonIds: ['l5', 'l6', 'l7'],
    enrolledCount: 9800,
    likesCount: 2700,
    difficulty: 'Beginner',
    totalDuration: 480,
  },
  {
    id: 'course3',
    organizationId: 'org1',
    title: 'AI & Machine Learning Intro',
    thumbnail: 'https://picsum.photos/seed/aiml/400/300',
    description:
      'Demystify artificial intelligence and machine learning concepts in easy 3-minute sessions.',
    category: 'ai',
    tags: ['ai', 'machine learning', 'neural networks', 'data'],
    lessonIds: ['l8', 'l9', 'l10', 'l11'],
    enrolledCount: 18700,
    likesCount: 5100,
    difficulty: 'Intermediate',
    totalDuration: 660,
  },
  {
    id: 'course4',
    organizationId: 'org2',
    title: 'Calculus Made Simple',
    thumbnail: 'https://picsum.photos/seed/calculus/400/300',
    description:
      'From limits to derivatives — conquer calculus one concept at a time with clear visual explanations.',
    category: 'math',
    tags: ['calculus', 'derivatives', 'integrals', 'limits'],
    lessonIds: ['l12', 'l13', 'l14'],
    enrolledCount: 7200,
    likesCount: 1900,
    difficulty: 'Intermediate',
    totalDuration: 420,
  },
  {
    id: 'course5',
    organizationId: 'org2',
    title: 'Psychology of Learning',
    thumbnail: 'https://picsum.photos/seed/psych/400/300',
    description:
      'Understand how the brain learns, retains information, and builds habits for peak performance.',
    category: 'psychology',
    tags: ['psychology', 'memory', 'habits', 'learning'],
    lessonIds: ['l15', 'l16', 'l17', 'l18'],
    enrolledCount: 14300,
    likesCount: 4200,
    difficulty: 'Beginner',
    totalDuration: 600,
  },
  {
    id: 'course6',
    organizationId: 'org3',
    title: 'Business Strategy 101',
    thumbnail: 'https://picsum.photos/seed/bizstrat/400/300',
    description:
      'Learn the frameworks used by top companies to make decisions, compete, and grow.',
    category: 'business',
    tags: ['strategy', 'business', 'management', 'frameworks'],
    lessonIds: ['l19', 'l20', 'l21'],
    enrolledCount: 8900,
    likesCount: 2300,
    difficulty: 'Intermediate',
    totalDuration: 360,
  },
  {
    id: 'course7',
    organizationId: 'org3',
    title: 'Personal Finance Mastery',
    thumbnail: 'https://picsum.photos/seed/finance/400/300',
    description:
      'Take control of your money — budgeting, investing, and growing wealth explained simply.',
    category: 'finance',
    tags: ['finance', 'investing', 'budgeting', 'money'],
    lessonIds: ['l22', 'l23', 'l24', 'l25'],
    enrolledCount: 21600,
    likesCount: 6700,
    difficulty: 'Beginner',
    totalDuration: 600,
  },
  {
    id: 'course8',
    organizationId: 'org3',
    title: 'Digital Marketing Essentials',
    thumbnail: 'https://picsum.photos/seed/digimkt/400/300',
    description:
      'From SEO to social media ads — build your digital marketing toolkit with practical mini-lessons.',
    category: 'digital',
    tags: ['marketing', 'seo', 'social media', 'ads', 'digital'],
    lessonIds: ['l26', 'l27', 'l28'],
    enrolledCount: 11200,
    likesCount: 3400,
    difficulty: 'Beginner',
    totalDuration: 420,
  },
];

const makeTextLesson = (id, courseId, order, title, body, duration, hasQuiz, quiz) => ({
  id,
  courseId,
  order,
  title,
  type: 'text',
  content: { body },
  duration,
  thumbnail: `https://picsum.photos/seed/${id}thumb/400/300`,
  hasQuiz: !!quiz,
  quiz: quiz || null,
  ...engagementCounts(id),
});

// images: [{uri, caption}]
const makeImageLesson = (id, courseId, order, title, images, duration, hasQuiz, quiz) => ({
  id,
  courseId,
  order,
  title,
  type: 'image',
  content: { images },
  duration,
  thumbnail: `https://picsum.photos/seed/${id}thumb/400/300`,
  hasQuiz: !!quiz,
  quiz: quiz || null,
  ...engagementCounts(id),
});

const DEMO_VIDEO = 'https://res.cloudinary.com/djukmw9sx/video/upload/v1779186213/u01j2v7gklncoyeo3anl.mp4';

const makeVideoLesson = (id, courseId, order, title, videoUri, duration, hasQuiz, quiz) => ({
  id,
  courseId,
  order,
  title,
  type: 'video',
  content: {
    videoUri,
    thumbnailUri: `https://picsum.photos/seed/${id}vid/400/300`,
  },
  duration,
  thumbnail: `https://picsum.photos/seed/${id}thumb/400/300`,
  hasQuiz: !!quiz,
  quiz: quiz || null,
  ...engagementCounts(id),
});

export const LESSONS = [
  // -- Python Fundamentals (course1) --
  makeTextLesson('l1', 'course1', 1, 'What is Python?',
    `Python is a high-level, general-purpose programming language known for its simple, readable syntax. Created by Guido van Rossum in 1991, it has become one of the most popular languages in the world.

**Why Python?**
• Easy to read and write — almost like plain English
• Huge ecosystem of libraries (NumPy, Pandas, Django)
• Used in web development, data science, AI, automation

**Your first line of code:**
\`\`\`
print("Hello, World!")
\`\`\`

That single line outputs text to the screen. Python removes the complexity of compiled languages — no semicolons, no curly braces required.

Python uses indentation (spaces) to define code blocks, making it naturally readable and forcing clean code habits from day one.`,
    110,
    false,
    null
  ),

  makeImageLesson('l2', 'course1', 2, 'Variables & Data Types',
    [
      { uri: 'https://picsum.photos/seed/pytypes1/600/900', caption: 'Python has 4 core data types: int, float, str, and bool.' },
      { uri: 'https://picsum.photos/seed/pytypes2/600/900', caption: 'No declaration needed — just assign a value: age = 25, height = 5.9.' },
      { uri: 'https://picsum.photos/seed/pytypes3/600/900', caption: 'Strings use quotes: name = "Alex". Booleans are True or False (capital first letter).' },
    ],
    120,
    true,
    {
      id: 'q1',
      lessonId: 'l2',
      questions: [
        {
          id: 'q1a',
          type: 'multiplechoice',
          text: 'Which data type would you use to store the value 3.14?',
          options: ['int', 'float', 'str', 'bool'],
          correctAnswer: 1,
        },
        {
          id: 'q1b',
          type: 'truefalse',
          text: 'In Python, you must declare a variable\'s type before using it.',
          correctAnswer: false,
        },
      ],
    }
  ),

  makeVideoLesson('l3', 'course1', 3, 'Loops & Conditionals', DEMO_VIDEO, 150,
    true,
    {
      id: 'q2',
      lessonId: 'l3',
      questions: [
        {
          id: 'q2a',
          type: 'multiplechoice',
          text: 'Which keyword starts a conditional block in Python?',
          options: ['when', 'if', 'check', 'case'],
          correctAnswer: 1,
        },
        {
          id: 'q2b',
          type: 'truefalse',
          text: 'A "for" loop in Python can iterate over a list.',
          correctAnswer: true,
        },
      ],
    }
  ),

  makeTextLesson('l4', 'course1', 4, 'Functions — Reusable Code',
    `A function is a reusable block of code that performs a specific task.

**Defining a function:**
\`\`\`
def greet(name):
    return f"Hello, {name}!"

result = greet("EduTok")
print(result)  # Hello, EduTok!
\`\`\`

**Why functions matter:**
1. **DRY principle** — Don't Repeat Yourself
2. Functions make code testable and maintainable
3. You can pass data in (parameters) and get data out (return values)

**Default parameters:**
\`\`\`
def power(base, exponent=2):
    return base ** exponent

print(power(3))    # 9 (uses default exponent)
print(power(2, 8)) # 256
\`\`\`

Functions are the building blocks of any real program. Mastering them unlocks everything else.`,
    160,
    false,
    null
  ),

  // -- Web Development Basics (course2) --
  makeTextLesson('l5', 'course2', 1, 'HTML: The Skeleton of the Web',
    `HTML (HyperText Markup Language) is the foundation of every webpage. It defines the structure and content of a page using **tags**.

**Basic structure:**
\`\`\`html
<!DOCTYPE html>
<html>
  <head>
    <title>My Page</title>
  </head>
  <body>
    <h1>Hello World</h1>
    <p>This is a paragraph.</p>
  </body>
</html>
\`\`\`

**Common tags:**
• \`<h1>\` to \`<h6>\` — headings
• \`<p>\` — paragraphs
• \`<a href="...">\` — links
• \`<img src="...">\` — images
• \`<div>\` — generic container

Think of HTML as the bones of a building — it gives structure but not style.`,
    130,
    true,
    {
      id: 'q3',
      lessonId: 'l5',
      questions: [
        {
          id: 'q3a',
          type: 'truefalse',
          text: 'HTML stands for HyperText Markup Language.',
          correctAnswer: true,
        },
        {
          id: 'q3b',
          type: 'multiplechoice',
          text: 'Which HTML tag is used to create the largest heading?',
          options: ['<header>', '<h6>', '<h1>', '<heading>'],
          correctAnswer: 2,
        },
      ],
    }
  ),

  makeImageLesson('l6', 'course2', 2, 'CSS: Styling Your Pages',
    [
      { uri: 'https://picsum.photos/seed/cssbox1/600/900', caption: 'Every HTML element is a box with four layers: content, padding, border, and margin.' },
      { uri: 'https://picsum.photos/seed/cssbox2/600/900', caption: 'Padding adds space inside the border. Margin adds space outside — between elements.' },
      { uri: 'https://picsum.photos/seed/cssbox3/600/900', caption: 'Use box-sizing: border-box so padding & border don\'t increase the element\'s total size.' },
    ],
    140,
    false,
    null
  ),

  makeVideoLesson('l7', 'course2', 3, 'JavaScript: Adding Interactivity', DEMO_VIDEO, 170,
    true,
    {
      id: 'q4',
      lessonId: 'l7',
      questions: [
        {
          id: 'q4a',
          type: 'multiplechoice',
          text: 'What does JavaScript primarily add to web pages?',
          options: ['Structure', 'Style', 'Interactivity', 'SEO'],
          correctAnswer: 2,
        },
      ],
    }
  ),

  // -- AI & ML Intro (course3) --
  makeTextLesson('l8', 'course3', 1, 'What is Artificial Intelligence?',
    `Artificial Intelligence (AI) is the simulation of human intelligence in machines. AI systems learn, reason, and solve problems — tasks once thought exclusive to humans.

**Three types of AI:**
1. **Narrow AI** — Designed for one task (Siri, image recognition)
2. **General AI** — Human-level reasoning (theoretical)
3. **Super AI** — Beyond human capability (hypothetical)

**AI in your daily life:**
• Netflix recommendations
• Email spam filters
• Google Maps routing
• Face unlock on your phone

AI is not magic — it's pattern recognition at massive scale, powered by data and mathematics.`,
    120,
    false,
    null
  ),

  makeImageLesson('l9', 'course3', 2, 'Machine Learning Explained',
    [
      { uri: 'https://picsum.photos/seed/mltype1/600/900', caption: 'Supervised Learning: algorithms train on labeled data to predict outputs for new inputs.' },
      { uri: 'https://picsum.photos/seed/mltype2/600/900', caption: 'Unsupervised Learning: find hidden patterns and clusters in unlabeled data.' },
      { uri: 'https://picsum.photos/seed/mltype3/600/900', caption: 'Reinforcement Learning: an agent learns by trial-and-error to maximize cumulative rewards.' },
    ],
    150,
    true,
    {
      id: 'q5',
      lessonId: 'l9',
      questions: [
        {
          id: 'q5a',
          type: 'truefalse',
          text: 'Machine Learning is a subset of Artificial Intelligence.',
          correctAnswer: true,
        },
        {
          id: 'q5b',
          type: 'multiplechoice',
          text: 'Which type of ML uses labeled training data?',
          options: ['Unsupervised', 'Reinforcement', 'Supervised', 'Transfer'],
          correctAnswer: 2,
        },
      ],
    }
  ),

  makeVideoLesson('l10', 'course3', 3, 'Neural Networks in 3 Minutes', DEMO_VIDEO, 160,
    false,
    null
  ),

  makeTextLesson('l11', 'course3', 4, 'Practical AI: Prompting & Tools',
    `The most immediately useful AI skill today is **prompt engineering** — how to communicate effectively with AI models.

**Core principles:**
1. **Be specific** — Vague prompts give vague results
2. **Provide context** — Tell the AI who you are and what you need
3. **Iterate** — Refine your prompt based on output

**Example prompt evolution:**
- Bad: "Write a story"
- Better: "Write a 200-word story about a robot"
- Best: "Write a 200-word sci-fi story about a robot discovering it can dream. Use vivid sensory language. Target audience: teens."

**Practical AI tools to explore:**
• ChatGPT / Claude — Writing, coding, analysis
• Midjourney / DALL-E — Image generation
• GitHub Copilot — Code assistance
• Perplexity — Research with sources`,
    155,
    true,
    {
      id: 'q6',
      lessonId: 'l11',
      questions: [
        {
          id: 'q6a',
          type: 'multiplechoice',
          text: 'What does "prompt engineering" refer to?',
          options: [
            'Building AI hardware',
            'Writing effective instructions for AI',
            'Training neural networks',
            'Coding AI models',
          ],
          correctAnswer: 1,
        },
      ],
    }
  ),

  // -- Calculus Made Simple (course4) --
  makeTextLesson('l12', 'course4', 1, 'Understanding Limits',
    `A **limit** describes what a function approaches as the input gets close to a value — even if the function never actually reaches it.

**Notation:**
\`lim(x→2) of (x² - 4)/(x - 2) = 4\`

Even though plugging x=2 causes a 0/0 situation, the limit is 4. We're asking: "What value does this expression approach?"

**Real-world analogy:**
Imagine you're driving toward a stop sign. Your speed approaches zero as you get close. The limit is 0 mph — even before you stop.

**Why limits matter:**
Limits are the foundation of calculus. Every derivative and integral is defined using limits. Master this concept and calculus becomes logical.`,
    140,
    false,
    null
  ),

  makeImageLesson('l13', 'course4', 2, 'Derivatives: Rate of Change',
    [
      { uri: 'https://picsum.photos/seed/deriv1/600/900', caption: 'A derivative is the slope of the tangent line at any point on a curve — it measures rate of change.' },
      { uri: 'https://picsum.photos/seed/deriv2/600/900', caption: 'For f(x) = x², the derivative is f\'(x) = 2x. At x=3 the function is rising at a rate of 6.' },
    ],
    150,
    true,
    {
      id: 'q7',
      lessonId: 'l13',
      questions: [
        {
          id: 'q7a',
          type: 'truefalse',
          text: 'A derivative measures the rate of change of a function.',
          correctAnswer: true,
        },
        {
          id: 'q7b',
          type: 'multiplechoice',
          text: 'If f(x) = x³, what is f\'(x)?',
          options: ['x²', '3x', '3x²', 'x³'],
          correctAnswer: 2,
        },
      ],
    }
  ),

  makeVideoLesson('l14', 'course4', 3, 'Integrals: The Area Under the Curve', DEMO_VIDEO, 155,
    true,
    {
      id: 'q8',
      lessonId: 'l14',
      questions: [
        {
          id: 'q8a',
          type: 'multiplechoice',
          text: 'What does a definite integral calculate?',
          options: [
            'The slope at a point',
            'The area under a curve between two points',
            'The maximum value of a function',
            'The limit at infinity',
          ],
          correctAnswer: 1,
        },
      ],
    }
  ),

  // -- Psychology of Learning (course5) --
  makeTextLesson('l15', 'course5', 1, 'The Learning Loop',
    `Learning happens in a cycle — not in a straight line. Psychologist Edgar Dale's research showed that **how** you engage with material determines how much you remember.

**The Forgetting Curve (Ebbinghaus):**
Without review, we forget ~50% of new information within an hour, 70% within a day.

**The Learning Loop:**
1. **Encode** — Take in new information
2. **Process** — Connect it to what you already know
3. **Retrieve** — Test yourself (this is where real learning happens)
4. **Space** — Review at increasing intervals

**Key insight:** Passive reading is weak learning. Active retrieval (quizzes, explaining concepts aloud) is 2-3x more effective.

This is why EduTok uses quizzes after every lesson — it's neuroscience, not just assessment.`,
    145,
    false,
    null
  ),

  makeImageLesson('l16', 'course5', 2, 'Spaced Repetition',
    [
      { uri: 'https://picsum.photos/seed/srs1/600/900', caption: 'Review at expanding intervals — 1 day → 3 days → 1 week → 2 weeks — to fight forgetting.' },
      { uri: 'https://picsum.photos/seed/srs2/600/900', caption: 'Each successful recall strengthens the memory trace. Apps like Anki automate this algorithm.' },
    ],
    130,
    true,
    {
      id: 'q9',
      lessonId: 'l16',
      questions: [
        {
          id: 'q9a',
          type: 'truefalse',
          text: 'Cramming the night before is as effective as spaced repetition.',
          correctAnswer: false,
        },
        {
          id: 'q9b',
          type: 'multiplechoice',
          text: 'What is the key principle behind spaced repetition?',
          options: [
            'Reviewing material in longer sessions',
            'Reviewing at expanding time intervals',
            'Watching videos multiple times',
            'Highlighting key passages',
          ],
          correctAnswer: 1,
        },
      ],
    }
  ),

  makeVideoLesson('l17', 'course5', 3, 'Growth Mindset vs Fixed Mindset', DEMO_VIDEO, 150,
    false,
    null
  ),

  makeTextLesson('l18', 'course5', 4, 'Building Learning Habits',
    `Habits are automatic behaviors triggered by cues. **Habit stacking** — attaching new habits to existing ones — is the most reliable way to build a learning practice.

**The Habit Loop (James Clear, Atomic Habits):**
1. **Cue** — The trigger (alarm, location, event)
2. **Craving** — The motivation
3. **Routine** — The behavior itself
4. **Reward** — The reinforcement

**Habit stack for learning:**
"After I [existing habit], I will learn one EduTok lesson."

Examples:
• After my morning coffee → 1 lesson
• After I sit down on the bus → 1 lesson
• After lunch, before I check social media → 2 lessons

**The 2-Minute Rule:** Make the new habit small enough to do in 2 minutes. Once started, you'll usually continue.`,
    165,
    true,
    {
      id: 'q10',
      lessonId: 'l18',
      questions: [
        {
          id: 'q10a',
          type: 'multiplechoice',
          text: 'What is "habit stacking"?',
          options: [
            'Doing multiple habits simultaneously',
            'Attaching a new habit to an existing one',
            'Recording your habits in a journal',
            'Replacing bad habits with good ones',
          ],
          correctAnswer: 1,
        },
      ],
    }
  ),

  // -- Business Strategy 101 (course6) --
  makeTextLesson('l19', 'course6', 1, 'Porter\'s Five Forces',
    `Michael Porter's Five Forces framework helps businesses analyze competitive intensity and attractiveness of an industry.

**The Five Forces:**
1. **Threat of new entrants** — How easy is it for competitors to enter?
2. **Bargaining power of suppliers** — Can suppliers raise prices easily?
3. **Bargaining power of buyers** — Can customers demand lower prices?
4. **Threat of substitutes** — Are there alternative solutions?
5. **Competitive rivalry** — How intense is competition among existing players?

**Example — Netflix:**
• High threat of substitutes (YouTube, Disney+)
• High competitive rivalry (streaming wars)
• Low supplier power (they produce own content)
• Low buyer power (subscriptions are cheap)

This analysis reveals why Netflix invests heavily in original content — to reduce substitute threats.`,
    150,
    true,
    {
      id: 'q11',
      lessonId: 'l19',
      questions: [
        {
          id: 'q11a',
          type: 'multiplechoice',
          text: 'How many forces are in Porter\'s Five Forces framework?',
          options: ['3', '4', '5', '6'],
          correctAnswer: 2,
        },
        {
          id: 'q11b',
          type: 'truefalse',
          text: 'Bargaining power of buyers is one of Porter\'s Five Forces.',
          correctAnswer: true,
        },
      ],
    }
  ),

  makeImageLesson('l20', 'course6', 2, 'SWOT Analysis',
    [
      { uri: 'https://picsum.photos/seed/swot1/600/900', caption: 'Strengths & Weaknesses are internal factors within your control to improve or leverage.' },
      { uri: 'https://picsum.photos/seed/swot2/600/900', caption: 'Opportunities & Threats are external market forces you must monitor and adapt to.' },
      { uri: 'https://picsum.photos/seed/swot3/600/900', caption: 'Cross-analysis: use Strengths to seize Opportunities and to neutralize Threats.' },
    ],
    120,
    false,
    null
  ),

  makeVideoLesson('l21', 'course6', 3, 'Blue Ocean Strategy', DEMO_VIDEO, 145,
    true,
    {
      id: 'q12',
      lessonId: 'l21',
      questions: [
        {
          id: 'q12a',
          type: 'truefalse',
          text: 'Blue Ocean Strategy focuses on competing in existing markets.',
          correctAnswer: false,
        },
      ],
    }
  ),

  // -- Personal Finance Mastery (course7) --
  makeTextLesson('l22', 'course7', 1, 'The 50/30/20 Budget Rule',
    `The 50/30/20 rule is the simplest effective budgeting framework, popularized by Senator Elizabeth Warren.

**How it works:**
• **50% Needs** — Rent, food, utilities, transport
• **30% Wants** — Dining out, entertainment, subscriptions
• **20% Savings/Debt** — Emergency fund, investments, debt repayment

**Example (Monthly income: $3,000):**
• Needs: $1,500
• Wants: $900
• Savings: $600

**Getting started:**
1. Track your income for one month
2. Categorize every expense as Need/Want/Savings
3. Adjust until you hit the 50/30/20 split

**Pro tip:** Automate your savings on payday — pay yourself first before spending. Most people save what's left; wealthy people spend what's left after saving.`,
    155,
    true,
    {
      id: 'q13',
      lessonId: 'l22',
      questions: [
        {
          id: 'q13a',
          type: 'multiplechoice',
          text: 'In the 50/30/20 rule, what percentage goes to savings/debt?',
          options: ['10%', '20%', '30%', '50%'],
          correctAnswer: 1,
        },
        {
          id: 'q13b',
          type: 'truefalse',
          text: 'In the 50/30/20 rule, 30% is allocated to Needs.',
          correctAnswer: false,
        },
      ],
    }
  ),

  makeImageLesson('l23', 'course7', 2, 'Compound Interest: The 8th Wonder',
    [
      { uri: 'https://picsum.photos/seed/compound1/600/900', caption: '$1,000 at 10% annual return becomes $2,594 in 10 years — without adding a cent.' },
      { uri: 'https://picsum.photos/seed/compound2/600/900', caption: 'After 30 years: $17,449. Starting investing at 25 vs 35 can mean hundreds of thousands difference.' },
    ],
    140,
    false,
    null
  ),

  makeVideoLesson('l24', 'course7', 3, 'Index Funds: Investing for Beginners', DEMO_VIDEO, 165,
    true,
    {
      id: 'q14',
      lessonId: 'l24',
      questions: [
        {
          id: 'q14a',
          type: 'truefalse',
          text: 'Index funds track a market index like the S&P 500.',
          correctAnswer: true,
        },
        {
          id: 'q14b',
          type: 'multiplechoice',
          text: 'What is a key advantage of index funds vs individual stocks?',
          options: [
            'Higher returns guaranteed',
            'Instant liquidity',
            'Built-in diversification',
            'No fees whatsoever',
          ],
          correctAnswer: 2,
        },
      ],
    }
  ),

  makeTextLesson('l25', 'course7', 4, 'Emergency Fund: Your Financial Safety Net',
    `An emergency fund is money set aside exclusively for unexpected expenses — job loss, medical bills, car breakdown.

**The rule:** 3-6 months of living expenses in a liquid, accessible account.

**Why most people skip it:**
• "I'll start when I have more money" (backwards thinking)
• Low interest rates feel discouraging
• Investing feels more exciting

**The real cost of no emergency fund:**
Without one, any surprise expense means credit card debt at 20%+ interest. A $2,000 car repair becomes $2,800 in a year.

**How to build one:**
1. Set a target (3 months expenses = $X)
2. Open a separate high-yield savings account
3. Auto-transfer $50-$200/month
4. Never touch it except for true emergencies

The emergency fund isn't an investment — it's insurance for your financial life.`,
    160,
    false,
    null
  ),

  // -- Digital Marketing Essentials (course8) --
  makeTextLesson('l26', 'course8', 1, 'SEO: Getting Found on Google',
    `Search Engine Optimization (SEO) is the practice of improving your content so search engines rank it higher — driving free, organic traffic.

**The three pillars of SEO:**
1. **Technical** — Site speed, mobile-friendliness, crawlability
2. **On-page** — Keywords, headings, meta descriptions, content quality
3. **Off-page** — Backlinks from other sites (authority signals)

**Keyword strategy:**
• Target long-tail keywords ("best budget running shoes for beginners")
• Match search intent — are users looking to buy, learn, or compare?
• Use tools: Google Keyword Planner, Ahrefs, SEMrush

**The #1 rule:** Create content that genuinely answers the user's question better than anyone else. Google's mission is to surface the best answer — be the best answer.

SEO results take 3-6 months but compound over time, unlike paid ads.`,
    155,
    true,
    {
      id: 'q15',
      lessonId: 'l26',
      questions: [
        {
          id: 'q15a',
          type: 'multiplechoice',
          text: 'What does "SEO" stand for?',
          options: [
            'Social Engagement Optimization',
            'Search Engine Optimization',
            'Site Enhancement Operations',
            'Sponsored Email Outreach',
          ],
          correctAnswer: 1,
        },
        {
          id: 'q15b',
          type: 'truefalse',
          text: 'SEO results typically appear within 24 hours.',
          correctAnswer: false,
        },
      ],
    }
  ),

  makeImageLesson('l27', 'course8', 2, 'Social Media Ad Funnel',
    [
      { uri: 'https://picsum.photos/seed/funnel1/600/900', caption: 'Awareness stage: use broad video ads and boosted posts to reach new audiences.' },
      { uri: 'https://picsum.photos/seed/funnel2/600/900', caption: 'Interest & Consideration: educate with content, testimonials, and comparison guides.' },
      { uri: 'https://picsum.photos/seed/funnel3/600/900', caption: 'Conversion: retarget warm audiences with limited-time offers and direct calls to action.' },
    ],
    145,
    false,
    null
  ),

  makeVideoLesson('l28', 'course8', 3, 'Email Marketing That Converts', DEMO_VIDEO, 150,
    true,
    {
      id: 'q16',
      lessonId: 'l28',
      questions: [
        {
          id: 'q16a',
          type: 'truefalse',
          text: 'Email marketing has a higher ROI than most other digital channels.',
          correctAnswer: true,
        },
      ],
    }
  ),
];

export const DEFAULT_USER = {
  id: 'user_demo',
  username: 'edutok_user',
  fullName: 'Demo User',
  phone: '',
  bio: 'Learning something new every day 📚',
  avatar: 'https://picsum.photos/seed/demouser/200/200',
  preferences: ['engineering', 'ai', 'finance'],
  phoneVerified: false,
  language: 'en',
  notificationsEnabled: true,
  createdAt: new Date().toISOString(),
};

export const DEFAULT_PROGRESS = {
  enrolledCourses: [],
  completedLessons: [],
  likedLessons: [],
  favoritedLessons: [],
  passedQuizzes: [],
  streak: 0,
  lastActiveDate: null,
  totalSeconds: 0,
};
