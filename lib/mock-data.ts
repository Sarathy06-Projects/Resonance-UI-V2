export const mockUsers = [
  {
    id: "1",
    name: "Alex Rivera",
    username: "arivera",
    avatar: "https://i.pravatar.cc/150?u=1",
    bio: "Product Designer @ Acme Corp. Obsessed with typography and interactions.",
    role: "Product Designer",
    followers: "14.2K",
    mutualFollowers: 12,
    verified: true
  },
  {
    id: "2",
    name: "Sarah Chen",
    username: "sarahc",
    avatar: "https://i.pravatar.cc/150?u=2",
    bio: "Design Systems Engineer. Building accessible and beautiful interfaces.",
    role: "UI Engineer",
    followers: "8.9K",
    mutualFollowers: 5,
    verified: false
  },
  {
    id: "3",
    name: "Marcus Johnson",
    username: "marcusj",
    avatar: "https://i.pravatar.cc/150?u=3",
    bio: "Motion Designer. Making things move smoothly.",
    role: "Motion Designer",
    followers: "22.1K",
    mutualFollowers: 8,
    verified: true
  }
];

export const mockPosts = [
  {
    id: "p1",
    author: mockUsers[0],
    content: "Just published a new article on why we should stop using pure black (#000000) for text. High contrast is great, but pure black on pure white causes eye strain. Opt for a dark grey like #111111 or #18181B instead. Thoughts?",
    timestamp: "2h ago",
    likes: 342,
    comments: 45,
    shares: 12,
    bookmarks: 89,
    hashtags: ["#UI", "#Accessibility", "#Typography"],
    badge: "Article",
    linkedArticle: "a2"
  },
  {
    id: "p2",
    author: mockUsers[1],
    content: "Working on the new design system components. Framer Motion makes these micro-interactions so much easier to implement compared to pure CSS.",
    images: ["https://images.unsplash.com/photo-1618761714954-0b8cd0026356?auto=format&fit=crop&q=80&w=800"],
    timestamp: "5h ago",
    likes: 892,
    comments: 102,
    shares: 54,
    bookmarks: 234,
    hashtags: ["#DesignSystems", "#React", "#FramerMotion"],
    badge: "Featured"
  },
  {
    id: "p3",
    author: mockUsers[2],
    content: "Has anyone tried the new Figma variables yet? It completely changes how we approach multi-brand design systems.",
    timestamp: "8h ago",
    likes: 56,
    comments: 12,
    shares: 2,
    bookmarks: 5,
    hashtags: ["#Figma", "#DesignTooling"]
  }
];

export const mockArticles = [
  {
    id: "a1",
    author: mockUsers[0],
    title: "The Future of Spatial Design Interfaces",
    preview: "With the rise of AR/VR headsets, we need to rethink how users interact with 3D space. It's no longer just about clicking; it's about gestures, gaze, and spatial awareness.",
    content: "<p>When we talk about design, we often get caught up in the visuals. But true product design is about problem solving. It's about understanding the constraints, the business goals, and most importantly, the user's needs.</p><h2>The core principles</h2><p>In my experience, the best interfaces share a few common traits: they are invisible. The user doesn't notice the UI because they are so focused on their task. This is achieved through careful attention to typography, spacing, and contrast.</p><blockquote><p>Good design is obvious. Great design is transparent. - Joe Sparano</p></blockquote><p>As we move into a new era of spatial computing and AI-driven interfaces, these fundamental principles remain unchanged. The medium evolves, but human psychology stays the same.</p>",
    coverImage: "https://images.unsplash.com/photo-1622675363311-3e1904dc1885?auto=format&fit=crop&q=80&w=1200",
    readTime: "5 min read",
    timestamp: "Oct 12",
    tags: ["Spatial Design", "AR/VR", "UX"]
  },
  {
    id: "a2",
    author: mockUsers[1],
    title: "Building Accessible Color Palettes",
    preview: "Accessibility shouldn't be an afterthought. Here's a step-by-step guide to generating color palettes that look great and meet WCAG AAA standards out of the box.",
    content: "<p>Accessibility is a core component of great design. Let's look at how to build color palettes that work for everyone.</p><h2>Understanding Contrast</h2><p>The contrast ratio between text and its background must be at least 4.5:1 for normal text and 3:1 for large text.</p><ul><li>Use tools like WebAIM contrast checker</li><li>Don't rely solely on color to convey meaning</li><li>Test your designs in grayscale</li></ul>",
    coverImage: "https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?auto=format&fit=crop&q=80&w=1200",
    readTime: "8 min read",
    timestamp: "Oct 10",
    tags: ["Accessibility", "UI", "Color Theory"]
  }
];

export const trendingHashtags = [
  { tag: "#Typography", posts: "1.2K posts" },
  { tag: "#Accessibility", posts: "870 posts" },
  { tag: "#AIUX", posts: "640 posts" },
  { tag: "#DesignSystems", posts: "530 posts" },
  { tag: "#FramerMotion", posts: "412 posts" },
  { tag: "#MicroInteractions", posts: "320 posts" }
];

export const exploreTopics = [
  "UI Design", "UX", "Motion", "Typography", 
  "Accessibility", "Research", "Design Systems", 
  "AI", "Branding", "Illustration", "Spatial Design"
];

export const suggestedCommunities = [
  { id: "c1", name: "Framer Motion Experts", members: "12.4K", icon: "✨" },
  { id: "c2", name: "Design Systems", members: "8.2K", icon: "🎨" },
  { id: "c3", name: "UX Research", members: "5.1K", icon: "🔍" },
  { id: "c4", name: "Typography Nerds", members: "4.3K", icon: "Aa" }
];

export const upcomingEvents = [
  { id: "e1", title: "Figma Config Watch Party", date: "Tomorrow, 10:00 AM", attendees: 124 },
  { id: "e2", title: "Accessibility in Design Workshop", date: "Oct 24, 2:00 PM", attendees: 56 }
];

export const designChallenges = [
  { id: "dc1", title: "Redesign a boarding pass", participants: "1.2K", deadline: "Ends in 2 days" }
];

export const popularResources = [
  { id: "r1", title: "Untitled UI", type: "Figma UI Kit" },
  { id: "r2", title: "Radix Colors", type: "Color System" },
  { id: "r3", title: "Lucide Icons", type: "Icon Set" }
];
