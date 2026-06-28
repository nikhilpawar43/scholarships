import { useState, useRef, useEffect, useMemo } from "react";
import { BookOpen, Search, X, Filter, ExternalLink, ChevronDown } from "lucide-react";
import scholarships from "./data/scholarships.json";

export default function ScholarshipApp() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevels, setSelectedLevels] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [selectedScholarship, setSelectedScholarship] = useState(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);

  const today = new Date("2026-06-22");

  // "central" → "Central Government", "state-maharashtra" → "Maharashtra",
  // "state-tamil-nadu" → "Tamil Nadu", etc.
  const getSourceLabel = (source) => {
    if (source === "central") return "Central Government";
    return source
        .replace(/^state-/, "")
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
  };

  // Count scholarships per source (fixed, doesn't change with other filters)
  const sourceCounts = useMemo(() => {
    const counts = {};
    scholarships.forEach((s) => {
      counts[s.source] = (counts[s.source] || 0) + 1;
    });
    return counts;
  }, []);

  // Sort: central first, then states alphabetically
  const sourceOptions = useMemo(() => {
    return Object.keys(sourceCounts).sort((a, b) => {
      if (a === "central") return -1;
      if (b === "central") return 1;
      return getSourceLabel(a).localeCompare(getSourceLabel(b));
    });
  }, [sourceCounts]);

  const filterGroups = [
    {
      title: "Level",
      state: selectedLevels,
      setState: setSelectedLevels,
      options: ["School", "Undergraduate", "Postgraduate", "PhD", "Professional"],
    },
    {
      title: "Category",
      state: selectedCategories,
      setState: setSelectedCategories,
      options: ["General", "SC", "ST", "OBC", "Minority", "EWS", "Girls", "PwD", "VJNT", "SBC", "Maratha-Kunbi"],
    },
    {
      title: "Field of Study",
      state: selectedFields,
      setState: setSelectedFields,
      options: ["Engineering", "Medical", "Arts", "Commerce", "Science"],
    },
  ];

  const toggleFilter = (state, setState, value) => {
    if (state.includes(value)) {
      setState(state.filter((v) => v !== value));
    } else {
      setState([...state, value]);
    }
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedSource(null);
    setSelectedLevels([]);
    setSelectedCategories([]);
    setSelectedFields([]);
  };

  const getDeadlineInfo = (dateStr) => {
    const deadline = new Date(dateStr);
    const daysUntil = Math.floor((deadline - today) / (1000 * 60 * 60 * 24));
    const formatted = deadline.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    if (daysUntil < 0) {
      return { status: "closed", label: `Closed ${formatted}`, full: `Closed on ${formatted}` };
    }
    if (daysUntil <= 30) {
      return {
        status: "soon",
        label: `Closes ${formatted}`,
        full: `Closes on ${formatted} (${daysUntil} day${daysUntil === 1 ? "" : "s"} left)`,
      };
    }
    return { status: "open", label: `Closes ${formatted}`, full: `Closes on ${formatted}` };
  };

  const matchesFilters = (s) => {
    const sourceMatch = !selectedSource || s.source === selectedSource;
    const q = searchQuery.toLowerCase().trim();
    const searchMatch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.provider.toLowerCase().includes(q) ||
      s.eligibility_summary.toLowerCase().includes(q);

    const levelMatch =
      selectedLevels.length === 0 || s.level.some((l) => selectedLevels.includes(l));

    const categoryMatch =
      selectedCategories.length === 0 || s.category.some((c) => selectedCategories.includes(c));

    const fieldMatch =
      selectedFields.length === 0 ||
      s.field_of_study.includes("All") ||
      s.field_of_study.some((f) => selectedFields.includes(f));

    return sourceMatch && searchMatch && levelMatch && categoryMatch && fieldMatch;
  };

  const filteredScholarships = scholarships.filter(matchesFilters);
  const activeFilterCount = (selectedSource ? 1 : 0) + selectedLevels.length + selectedCategories.length + selectedFields.length;

  const deadlineColor = (status) => {
    if (status === "closed") return "text-gray-400";
    if (status === "soon") return "text-amber-700 font-medium";
    return "text-amber-600";
  };

  const FilterPanel = () => (
    <div className="space-y-7">
      {/* Source dropdown — always shown first */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="h-3.5 w-0.5 bg-amber-500 rounded-full"></span>
          <h3 className="text-xs font-medium tracking-wider uppercase text-gray-500">
            Source
          </h3>
        </div>
        <SourceDropdown />
      </div>

      {filterGroups.map((group) => (
        <div key={group.title}>
          <div className="flex items-center gap-2 mb-3">
            <span className="h-3.5 w-0.5 bg-amber-500 rounded-full"></span>
            <h3 className="text-xs font-medium tracking-wider uppercase text-gray-500">
              {group.title}
            </h3>
          </div>
          <div className="flex flex-col gap-2.5 pl-3">
            {group.options.map((opt) => {
              const isActive = group.state.includes(opt);
              return (
                <label
                  key={opt}
                  className="flex items-center gap-2.5 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={() => toggleFilter(group.state, group.setState, opt)}
                    className="h-4 w-4 rounded border-gray-300 focus:ring-amber-500 focus:ring-offset-0 accent-amber-600"
                  />
                  <span className={isActive ? "text-amber-700 font-medium" : "text-gray-700"}>
                    {opt}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
      {activeFilterCount > 0 && (
        <button
          onClick={clearAllFilters}
          className="text-xs text-amber-700 hover:text-amber-800 font-medium underline">
          Clear all filters
        </button>
      )}
    </div>
  );

  const renderModal = () => {
    if (!selectedScholarship) return null;
    const s = selectedScholarship;
    const deadline = getDeadlineInfo(s.deadline);
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/40"
        onClick={() => setSelectedScholarship(null)}
      >
        <div
          className="bg-white rounded-xl max-w-3xl w-full relative shadow-xl flex flex-col"
          style={{ maxHeight: "85vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button — sits on the modal frame, stays visible while content scrolls */}
          <button
            onClick={() => setSelectedScholarship(null)}
            className="absolute top-3 right-3 p-2 bg-white rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 shadow-sm z-20 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Scrollable content */}
          <div className="overflow-y-auto">
            <div className="px-8 pt-8 pb-6 border-b border-gray-100">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">{s.provider}</p>
              <h2 className="text-2xl font-semibold text-gray-900 leading-snug pr-10 mb-4">
                {s.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                {s.level.map((l) => (
                  <span
                    key={l}
                    className="text-xs font-medium px-2 py-1 bg-amber-100 text-amber-800 rounded"
                  >
                    {l}
                  </span>
                ))}
                {s.field_of_study.includes("All") ? (
                  <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-700 rounded">
                    All fields
                  </span>
                ) : (
                  s.field_of_study.map((f) => (
                    <span
                      key={f}
                      className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-700 rounded"
                    >
                      {f}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="px-8 py-5 bg-amber-50 border-b border-gray-100 flex flex-wrap gap-x-10 gap-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Award</p>
                <p className="text-base font-semibold text-gray-900">{s.amount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Deadline</p>
                <p
                  className={`text-base font-semibold ${
                    deadline.status === "closed"
                      ? "text-gray-500"
                      : deadline.status === "soon"
                      ? "text-amber-700"
                      : "text-gray-900"
                  }`}
                >
                  {deadline.full}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Eligible Categories
                </p>
                <p className="text-sm text-gray-700">{s.category.join(", ")}</p>
              </div>
            </div>

            <div className="px-8 py-6 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-3.5 w-0.5 bg-amber-500 rounded-full"></span>
                  <h3 className="text-xs font-medium tracking-wider uppercase text-gray-500">
                    Overview
                  </h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{s.description}</p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-3.5 w-0.5 bg-amber-500 rounded-full"></span>
                  <h3 className="text-xs font-medium tracking-wider uppercase text-gray-500">
                    Eligibility
                  </h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{s.eligibility_full}</p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-3.5 w-0.5 bg-amber-500 rounded-full"></span>
                  <h3 className="text-xs font-medium tracking-wider uppercase text-gray-500">
                    Documents Required
                  </h3>
                </div>
                <ul className="space-y-1.5">
                  {s.documents_required.map((d, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-amber-600 mt-0.5">•</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-3.5 w-0.5 bg-amber-500 rounded-full"></span>
                  <h3 className="text-xs font-medium tracking-wider uppercase text-gray-500">
                    Application Process
                  </h3>
                </div>
                <ol className="space-y-2">
                  {s.application_process.map((step, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-3">
                      <span className="text-xs font-medium h-5 w-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="flex-1">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
              <a
                href={s.official_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-700 hover:text-amber-700 flex items-center gap-1.5"
              >
                Official notification
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              {deadline.status !== "closed" ? (
                <a
                  href={s.apply_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-5 py-2.5 rounded-md flex items-center gap-2 transition-colors"
                >
                  Apply Now
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <span className="text-sm text-gray-500 px-5 py-2.5">Applications closed</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SourceDropdown = () => {
    const ref = useRef(null);

    // Close when clicking outside
    useEffect(() => {
      if (!sourceDropdownOpen) return;
      const onClick = (e) => {
        if (ref.current && !ref.current.contains(e.target)) {
          setSourceDropdownOpen(false);
        }
      };
      document.addEventListener("mousedown", onClick);
      return () => document.removeEventListener("mousedown", onClick);
    }, [sourceDropdownOpen]);

    const handleSelect = (source) => {
      // Reset all other filters when source changes
      setSelectedSource(source);
      setSearchQuery("");
      setSelectedLevels([]);
      setSelectedCategories([]);
      setSelectedFields([]);
      setSourceDropdownOpen(false);
    };

    return (
        <div ref={ref} className="relative">
          <button
              onClick={() => setSourceDropdownOpen(!sourceDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-md text-sm bg-white hover:border-amber-400 transition-colors"
          >
        <span className={selectedSource ? "text-amber-700 font-medium" : "text-gray-700"}>
          {selectedSource ? getSourceLabel(selectedSource) : "All sources"}
        </span>
            <ChevronDown
                className={`h-4 w-4 text-gray-400 transition-transform ${
                    sourceDropdownOpen ? "rotate-180" : ""
                }`}
            />
          </button>

          {sourceDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-md z-20 overflow-hidden">
                <button
                    onClick={() => handleSelect(null)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                        selectedSource === null
                            ? "text-amber-700 font-medium bg-amber-50"
                            : "text-gray-700 hover:bg-amber-50"
                    }`}
                >
                  <span>All sources</span>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium min-w-[28px] text-center">
              {scholarships.length}
            </span>
                </button>
                {sourceOptions.map((source) => (
                    <button
                        key={source}
                        onClick={() => handleSelect(source)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                            selectedSource === source
                                ? "text-amber-700 font-medium bg-amber-50"
                                : "text-gray-700 hover:bg-amber-50"
                        }`}
                    >
                      <span>{getSourceLabel(source)}</span>
                      <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-medium min-w-[28px] text-center">
                {sourceCounts[source]}
              </span>
                    </button>
                ))}
              </div>
          )}
        </div>
    );
  };

  return (
    <div
      className="min-h-screen bg-white text-gray-900"
      style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif" }}
    >
      <header className="border-b border-gray-200 bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-6">
          <button
              onClick={() => {
                clearAllFilters();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex-shrink-0 hover:opacity-80 transition-opacity"
              aria-label="Home">
            <BookOpen className="h-7 w-7 text-amber-600" strokeWidth={1.75} />
          </button>
          <div className="flex-1 max-w-2xl mx-auto relative">
            <Search className="h-4 w-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search scholarships..."
              className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-full text-sm placeholder:text-gray-400 focus:outline-none focus:border-amber-500"
            />
          </div>
          <nav>
            <a
              href="#about"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-sm text-gray-700 hover:text-amber-600 transition-colors"
            >
              About
            </a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Mobile filters button — only below xs */}
        <div className="xs:hidden mb-4 flex items-center justify-between">
          <button
              onClick={() => setMobileFiltersOpen(true)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-700 hover:border-amber-400">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
                <span className="bg-amber-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {activeFilterCount}
        </span>
            )}
          </button>
          <p className="text-sm text-gray-500">
            <span className="text-amber-700 font-medium">{filteredScholarships.length}</span> result
            {filteredScholarships.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Side-by-side panel: 1 col on mobile, 5 cols (20%/80%) at xs+ */}
        <div className="grid grid-cols-1 xs:grid-cols-5 gap-6">
          <aside className="hidden xs:block xs:col-span-1">
            <FilterPanel />
          </aside>

          <section className="xs:col-span-4">
            <div className="hidden xs:flex items-baseline justify-between mb-6">
              <p className="text-sm text-gray-500">
                Showing{" "}
                <span className="text-amber-700 font-medium">{filteredScholarships.length}</span> of{" "}
                {scholarships.length} scholarships
              </p>
            </div>
            {filteredScholarships.length === 0 ? (
              <div className="border border-gray-200 rounded-lg p-12 text-center">
                <p className="text-gray-600 mb-4">No scholarships match your filters.</p>
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-amber-700 hover:text-amber-800 font-medium underline"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
            // 3 tiles per row at xs+, stacked below
            <div className="grid grid-cols-1 xs:grid-cols-3 gap-6">
                {filteredScholarships.map((s) => {
                  const deadline = getDeadlineInfo(s.deadline);
                  return (
                    <article
                      key={s.id}
                      onClick={() => setSelectedScholarship(s)}
                      className="group p-5 border border-gray-200 rounded-lg hover:border-amber-400 hover:shadow-sm transition-all cursor-pointer bg-white flex flex-col"
                    >
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                        {s.provider}
                      </p>
                      <h2 className="text-base font-semibold text-gray-900 mb-3 leading-snug group-hover:text-amber-700 transition-colors">
                        {s.name}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {s.level.map((l) => (
                          <span
                            key={l}
                            className="text-xs font-medium px-2 py-0.5 bg-amber-100 text-amber-800 rounded"
                          >
                            {l}
                          </span>
                        ))}
                        <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                          {s.source === "central" ? "Central" : "Maharashtra"}
                        </span>
                        <span className={`text-xs ${deadlineColor(deadline.status)}`}>
                          {deadline.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-5 leading-relaxed flex-1">
                        {s.eligibility_summary}
                      </p>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <span className="text-sm font-semibold text-gray-900">{s.amount}</span>
                        <span className="text-sm font-medium text-amber-700 group-hover:text-amber-800">
                          View details →
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <section id="about" className="mt-24 pt-12 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-4 w-0.5 bg-amber-500 rounded-full"></span>
            <h2 className="text-xl font-semibold text-gray-900">About</h2>
          </div>
          <div className="text-sm text-gray-600 leading-relaxed space-y-4 text-justify hyphens-auto">
            <p>
              This directory brings together scholarships from the Indian central government and various state governments. Information about these schemes is scattered across dozens of official portals — each with its own structure, search interface, and update schedule — so eligible students often miss out simply because they never come across the right scheme in time. Most aggregator sites that try to fix this are ad-driven and noisy, which doesn't help either.
            </p>
            <p>
              This site keeps the essential details in one place: who can apply, how much the award is, when applications close, and where to apply. The filters on the left let you narrow down by source, education level, category, and field of study, so you can find relevant scholarships and start applying within minutes.
            </p>
            <p className="text-gray-500 border-t border-gray-100 pt-4">
              <span className="font-medium text-gray-700">Disclaimer:</span> This site is not affiliated with any government body. All listings are compiled from publicly available official sources. While care is taken to keep entries accurate and current, deadlines, amounts, and eligibility criteria can change between application cycles. Verify the latest details on the official portal of each scheme before applying.
            </p>
          </div>
        </section>
      </main>

      {mobileFiltersOpen && (
          <div className="fixed inset-0 z-40 xs:hidden">
            <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setMobileFiltersOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-80 max-w-[85%] bg-white overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Filters</h2>
                <button
                    onClick={() => setMobileFiltersOpen(false)}
                    className="text-gray-500 hover:text-gray-900"
                    aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <FilterPanel />
            </div>
          </div>
      )}

      {renderModal()}
    </div>
  );
}