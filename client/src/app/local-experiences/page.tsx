import { Compass, Mountain, Trees, Waves, Utensils, Flag } from 'lucide-react';
import Link from 'next/link';

export default function LocalExperiencesPage() {
  const experiences = [
    { title: 'Axe Throwing', category: 'Activities', icon: Compass, location: 'Swiftwater, PA', price: '$20.00/hr', image: '/wp-content/uploads/2026/05/Screenshot-2026-05-15-152904-384x300.png', desc: 'Fun and exciting axe throwing experience in Swiftwater.' },
    { title: 'Helicopter Tour', category: 'Tours & Adventures', icon: Compass, location: 'Pocono Mountains', price: '$500.00/person', image: '', desc: 'Breathtaking scenic helicopter tours over the Pocono mountain range.' },
    { title: 'Lake Harmony Boating & Kayaking', category: 'Water Sports', icon: Waves, location: 'Lake Harmony', price: 'From $45.00', image: '/wp-content/uploads/2026/05/aRROWHEAD-360x360.jpg', desc: 'Rent pontoon boats, paddleboards, and kayaks on pristine Lake Harmony waters.' },
    { title: 'Jack Frost & Big Boulder Skiing', category: 'Winter Sports', icon: Mountain, location: 'Blakeslee', price: 'Season Passes', image: '/wp-content/uploads/2026/05/BigBass-360x360.jpg', desc: 'Premier snowboarding, night skiing, and snow tubing in the Pocono Mountains.' },
    { title: 'Hickory Run State Park Hiking', category: 'Outdoors', icon: Trees, location: 'Albrightsville', price: 'Free Park Entry', image: '/wp-content/uploads/2026/05/BRIERCREST-WOODS-360x360.jpg', desc: 'Explore the famous Boulder Field and scenic waterfall trails.' },
    { title: 'Pocono International Raceway', category: 'Attractions', icon: Flag, location: 'Long Pond', price: 'Event Tickets', image: '/wp-content/uploads/2026/05/EMERALD-LAKES-360x360.jpg', desc: 'Experience NASCAR racing events and high-speed driving experiences.' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10 bg-[#f8f9fa] text-[#2b2b2b]">
      {/* Header Banner */}
      <div className="bg-white border border-gray-200 p-8 sm:p-12 rounded-3xl shadow-sm space-y-4 text-center max-w-4xl mx-auto">
        <span className="text-[#f15e75] text-xs font-extrabold uppercase tracking-widest block">Pocono Activity Guide</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#2b2b2b]">Local Experiences & Outdoor Adventures</h1>
        <p className="text-gray-600 text-sm max-w-2xl mx-auto">
          Make the most of your Pocono trip. Explore top-rated local attractions, ski resorts, state parks, water sports, and mountain dining spots.
        </p>
      </div>

      {/* Experience Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {experiences.map((exp, idx) => {
          const IconComponent = exp.icon;
          return (
            <div key={idx} className="bg-white border border-gray-200 p-8 rounded-3xl shadow-sm space-y-4 hover:shadow-xl transition-all">
              <div className="p-3.5 bg-[#f15e75]/10 text-[#f15e75] rounded-2xl w-fit">
                <IconComponent className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#f15e75]">{exp.category} • {exp.location}</span>
                <h3 className="text-xl font-bold text-[#2b2b2b] mt-1">{exp.title}</h3>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{exp.desc}</p>
              <Link href="/properties" className="inline-block text-xs font-bold text-[#f15e75] hover:text-[#f58d9d]">
                Find Nearby Cabins →
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
