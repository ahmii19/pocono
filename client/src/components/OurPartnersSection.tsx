'use client';

import { useState } from 'react';

export default function OurPartnersSection() {
  const [currentPage, setCurrentPage] = useState(0);

  const partnerPages = [
    [
      {
        name: 'VR POCONO',
        type: 'image',
        src: '/wp-content/uploads/2026/05/VRPOCONO_LOGO2.2.png'
      },
      {
        name: 'Cloudfactory',
        type: 'custom',
        render: () => (
          <span className="font-serif text-3xl font-extrabold text-[#2b2b2b] italic tracking-tight font-italic">
            Cloudfactory
          </span>
        )
      },
      {
        name: 'CrunchMaze',
        type: 'custom',
        render: () => (
          <div className="flex items-center gap-2 text-[#2b2b2b]">
            <svg className="w-7 h-7 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
            <span className="text-2xl font-extrabold tracking-tight font-sans">CrunchMaze</span>
          </div>
        )
      },
      {
        name: 'RentalFund',
        type: 'custom',
        render: () => (
          <div className="flex items-center gap-2 text-[#2b2b2b]">
            <svg className="w-7 h-7 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 22H5v-2h14v2zm-4-6H9v-2h6v2zm-1-8h-4V6h4v2z" />
            </svg>
            <span className="text-2xl font-extrabold tracking-tight font-sans">RentalFund</span>
          </div>
        )
      }
    ],
    [
      {
        name: 'Airbnb Direct Partner',
        type: 'custom',
        render: () => (
          <span className="text-xl font-extrabold text-[#2b2b2b] tracking-wider uppercase">
            Airbnb Partner
          </span>
        )
      },
      {
        name: 'Vrbo Verified',
        type: 'custom',
        render: () => (
          <span className="text-xl font-extrabold text-[#2b2b2b] tracking-wider uppercase">
            Vrbo Certified
          </span>
        )
      },
      {
        name: 'Booking.com',
        type: 'custom',
        render: () => (
          <span className="text-xl font-extrabold text-[#2b2b2b] tracking-wider uppercase">
            Booking.com
          </span>
        )
      },
      {
        name: 'Pocono Chamber',
        type: 'custom',
        render: () => (
          <span className="text-xl font-extrabold text-[#2b2b2b] tracking-wider uppercase">
            Pocono Chamber
          </span>
        )
      }
    ]
  ];

  const totalPages = partnerPages.length;

  const handlePrev = () => {
    setCurrentPage((prev) => (prev === 0 ? totalPages - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => (prev === totalPages - 1 ? 0 : prev + 1));
  };

  return (
    <section className="bg-[#f8f9fa] border-y border-[#d8dce1] py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#2b2b2b]">Our Partners</h2>
            <p className="text-xs text-[#7a7a7a] font-medium mt-1">
              We only work with the best companies around the globe
            </p>
          </div>

          {/* Prev / Next Controls matching live screenshot */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handlePrev}
              className="px-3.5 py-1 bg-white border border-[#f15e75] text-[#f15e75] hover:bg-[#f15e75] hover:text-white text-xs font-bold rounded-md transition-colors"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-3.5 py-1 bg-white border border-[#f15e75] text-[#f15e75] hover:bg-[#f15e75] hover:text-white text-xs font-bold rounded-md transition-colors"
            >
              Next
            </button>
          </div>
        </div>

        {/* Partner Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {partnerPages[currentPage].map((partner, idx) => (
            <div
              key={idx}
              className="bg-white border border-[#d8dce1] rounded-md h-[140px] flex items-center justify-center p-6 shadow-sm hover:shadow-md transition-all"
            >
              {partner.type === 'image' ? (
                <img
                  src={partner.src}
                  alt={partner.name}
                  className="max-h-[75px] w-auto object-contain"
                />
              ) : (
                partner.render ? partner.render() : null
              )}
            </div>
          ))}
        </div>

        {/* Pagination Dots matching live screenshot */}
        <div className="flex justify-center items-center gap-2.5 pt-2">
          {[0, 1, 2, 3, 4, 5].map((dotIdx) => {
            const isActive = dotIdx === (currentPage % 6);
            return (
              <button
                key={dotIdx}
                type="button"
                onClick={() => setCurrentPage(dotIdx % totalPages)}
                className={`h-2 rounded-full transition-all ${
                  isActive ? 'w-2.5 bg-[#4f5962]' : 'w-2 bg-[#d8dce1] hover:bg-gray-400'
                }`}
                aria-label={`Go to slide ${dotIdx + 1}`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
