import Link from 'next/link';
import { BookOpen, Calendar, ArrowRight } from 'lucide-react';

export default function BlogPage() {
  const posts = [
    { title: 'Top 10 Lake Harmony Cabins with Private Hot Tubs', date: 'August 10, 2026', category: 'Pocono Travel Guide', excerpt: 'Discover the best luxury chalets and cabins featuring secluded outdoor hot tubs in Lake Harmony, PA.' },
    { title: 'Ultimate Winter Ski Guide: Jack Frost & Big Boulder', date: 'July 28, 2026', category: 'Skiing & Snowboarding', excerpt: 'Everything you need to know about skiing, night riding, and booking slope-side chalets in the Poconos.' },
    { title: 'Why Booking Direct Saves You Up to 15% in the Poconos', date: 'July 15, 2026', category: 'Direct Booking Benefits', excerpt: 'Avoid hidden service fees on third-party sites by booking directly with local Pocono property hosts.' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10 bg-[#f8f9fa] text-[#2b2b2b]">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-[#f15e75] text-xs font-extrabold uppercase tracking-widest block">Pocono Travel Blog</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#2b2b2b]">Pocono Vacation Guides & News</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {posts.map((post, idx) => (
          <div key={idx} className="bg-white border border-gray-200 p-8 rounded-3xl shadow-sm space-y-4 flex flex-col justify-between hover:shadow-lg transition-all">
            <div className="space-y-3">
              <span className="text-xs font-extrabold text-[#f15e75] bg-[#f15e75]/10 px-3 py-1 rounded-full w-fit block">{post.category}</span>
              <h3 className="text-xl font-bold text-[#2b2b2b]">{post.title}</h3>
              <p className="text-xs text-gray-600 leading-relaxed">{post.excerpt}</p>
            </div>
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-500">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-[#f15e75]" />{post.date}</span>
              <Link href="/properties" className="text-[#f15e75] font-bold hover:text-[#f58d9d] flex items-center gap-1">Read →</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
