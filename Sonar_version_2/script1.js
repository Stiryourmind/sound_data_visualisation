const { useState, useMemo, useEffect } = React;
const { motion, AnimatePresence } = window.Motion;

// --- Icon Component ---
const IconWrapper = ({ name, ...props }) => {
    const icons = {
        Radar: (p) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/><path d="M4 6h.01"/><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"/><path d="M16.24 7.76A6 6 0 1 0 8.23 16.67"/><path d="M12 18h.01"/><path d="M17.99 11.66A6 6 0 0 1 15.77 16.67"/><circle cx="12" cy="12" r="2"/><path d="m13.41 10.59-5.66 5.66"/></svg>,
        Activity: (p) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
        Filter: (p) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
        Play: (p) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polygon points="5 3 19 12 5 21 5 3"/></svg>,
        Pause: (p) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/></svg>,
        Info: (p) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>,
        Volume2: (p) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
    };
    return icons[name] ? icons[name](props) : null;
};

// --- Constants & Configuration ---
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CATEGORIES = [
    { id: 'region', label: 'Region', color: '#3b82f6' },      // Blue
    { id: 'illegal', label: 'Illegal', color: '#ef4444' },    // Red
    { id: 'form_changing', label: 'Form Change', color: '#a855f7' }, // Purple
    { id: 'entrance', label: 'Entrance', color: '#22c55e' },  // Green
];
const RADIUS_STEP = 35;
const INNER_RADIUS = 40;

// --- Helper Functions ---
const generateData = (count = 200) => {
    return Array.from({ length: count }).map((_, i) => {
        const dayIndex = Math.floor(Math.random() * 7);
        const hour = Math.floor(Math.random() * 24);
        const minute = Math.floor(Math.random() * 60);
        const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
        
        let baseAmp = Math.random() * 40 + 10;
        if (category.id === 'illegal' && (hour > 20 || hour < 4)) baseAmp += 40;
        if (category.id === 'entrance' && (hour > 8 && hour < 10)) baseAmp += 30;

        return {
            id: i,
            dayIndex,
            day: DAYS[dayIndex],
            timeVal: hour + minute / 60,
            timeLabel: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
            categoryId: category.id,
            color: category.color,
            categoryLabel: category.label,
            amplitude: Math.min(100, baseAmp),
        };
    });
};

const getPosition = (dayIndex, timeVal) => {
    const r = INNER_RADIUS + (dayIndex * RADIUS_STEP);
    const angle = (timeVal / 24) * 360 - 90; 
    const rad = (angle * Math.PI) / 180;
    const x = r * Math.cos(rad);
    const y = r * Math.sin(rad);
    return { x, y };
};

// --- Audio Logic ---
const playDataSound = (point) => {
    // Create Audio Context
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();

    // Create Oscillator (Tone generator)
    const osc = ctx.createOscillator();
    // Create Gain Node (Volume control)
    const gainNode = ctx.createGain();

    // 1. Determine Wave Type based on Category
    // Sine = Smooth, Sawtooth = Harsh, Square = Digital, Triangle = Soft
    const waveTypes = {
        region: 'sine',
        illegal: 'sawtooth',
        form_changing: 'square',
        entrance: 'triangle'
    };
    osc.type = waveTypes[point.categoryId] || 'sine';

    // 2. Determine Frequency (Pitch) based on Time of Day
    // Earlier in day = Lower pitch, Later = Higher pitch
    // Base 220Hz + (Time * 20)
    const frequency = 220 + (point.timeVal * 25);
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    // 3. Determine Volume based on Amplitude
    // Max volume 0.1 to prevent ear damage
    const maxVol = 0.1;
    const volume = (point.amplitude / 100) * maxVol;

    // 4. Envelope (Attack and Decay for a "blip" sound)
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.05); // Attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3); // Decay

    // Connect nodes
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Play
    osc.start();
    osc.stop(ctx.currentTime + 0.3); // Stop after 0.3 seconds
};

// --- Main Component ---
function SonarDashboard() {
    const [data, setData] = useState([]);
    const [activeCategory, setActiveCategory] = useState('all');
    const [hoveredPoint, setHoveredPoint] = useState(null);
    const [isScanning, setIsScanning] = useState(true);

    useEffect(() => {
        setData(generateData());
    }, []);

    const filteredData = useMemo(() => {
        if (activeCategory === 'all') return data;
        return data.filter(d => d.categoryId === activeCategory);
    }, [data, activeCategory]);

    const rings = useMemo(() => DAYS.map((day, i) => {
        const r = INNER_RADIUS + (i * RADIUS_STEP);
        return (
            <g key={day}>
                <circle 
                    r={r} cx="0" cy="0" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" 
                />
                <text 
                    x="0" y={-r - 5} textAnchor="middle" className="text-[9px] fill-slate-600 font-mono uppercase" style={{ fontSize: '9px' }}
                >
                    {day}
                </text>
            </g>
        );
    }), []);

    const axisLines = useMemo(() => [0, 3, 6, 9, 12, 15, 18, 21].map(hour => {
        const angle = (hour / 24) * 360 - 90;
        const rad = (angle * Math.PI) / 180;
        const outerR = INNER_RADIUS + (6 * RADIUS_STEP) + 20;
        const x = outerR * Math.cos(rad);
        const y = outerR * Math.sin(rad);
        return (
            <g key={hour}>
                <line x1="0" y1="0" x2={x} y2={y} stroke="#1e293b" strokeWidth="1" opacity="0.5" />
                <text 
                    x={x * 1.1} y={y * 1.1} textAnchor="middle" alignmentBaseline="middle" className="fill-slate-500 font-mono" style={{ fontSize: '10px' }}
                >
                    {hour}:00
                </text>
            </g>
        );
    }), []);

    return (
        <div className="flex flex-col lg:flex-row h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
            
            {/* --- Left Panel --- */}
            <div className="w-full lg:w-80 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/50 backdrop-blur-sm z-10 h-auto lg:h-full">
                
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                            <IconWrapper name="Radar" className="w-6 h-6 text-cyan-400" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-100">Sonar View</h1>
                    </div>
                    <p className="text-xs text-slate-500 ml-1">Radial Temporal Analysis</p>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    
                    {/* Filters */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            <IconWrapper name="Filter" className="w-3 h-3" />
                            <span>Filter Signal</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            <button
                                onClick={() => setActiveCategory('all')}
                                className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                                    activeCategory === 'all' 
                                    ? 'bg-slate-800 border-slate-600 text-white shadow-lg' 
                                    : 'bg-transparent border-slate-800 text-slate-400 hover:bg-slate-800/50'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                                    <span className="text-sm">All Signals</span>
                                </div>
                                <span className="text-xs bg-slate-700/50 px-2 py-0.5 rounded-full text-slate-300">
                                    {data.length}
                                </span>
                            </button>

                            {CATEGORIES.map(cat => {
                                const count = data.filter(d => d.categoryId === cat.id).length;
                                const isActive = activeCategory === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(cat.id)}
                                        className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                                            isActive 
                                            ? 'bg-slate-800 border-slate-600 text-white shadow-lg' 
                                            : 'bg-transparent border-slate-800 text-slate-400 hover:bg-slate-800/50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                                            <span className="text-sm">{cat.label}</span>
                                        </div>
                                        <span className="text-xs bg-slate-700/50 px-2 py-0.5 rounded-full text-slate-300">
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Details Panel with Sound Button */}
                    <div className="relative p-4 rounded-xl bg-slate-900 border border-slate-800 min-h-[180px] flex flex-col justify-center overflow-hidden">
                        <AnimatePresence mode="wait">
                            {!hoveredPoint ? (
                                <motion.div 
                                    key="empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="h-full flex flex-col items-center justify-center text-slate-600 gap-2"
                                >
                                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center">
                                        <div className="w-2 h-2 bg-slate-700 rounded-full animate-ping"></div>
                                    </div>
                                    <span className="text-xs">Hover over signal points</span>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="content"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-3 w-full"
                                >
                                    <div>
                                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                                            <IconWrapper name="Activity" className="w-3 h-3" />
                                            Detected Event
                                        </div>
                                        <div className="text-lg font-mono font-bold text-white flex items-center gap-2">
                                            <span>{hoveredPoint.timeLabel}</span>
                                            <span className="text-sm font-normal text-slate-400">on {hoveredPoint.day}</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-2 bg-slate-800/50 rounded border border-slate-700/50">
                                            <div className="text-[10px] text-slate-500">Amplitude</div>
                                            <div className="text-sm font-mono text-cyan-300">
                                                {Math.round(hoveredPoint.amplitude)} dB
                                            </div>
                                        </div>
                                        <div className="p-2 bg-slate-800/50 rounded border border-slate-700/50">
                                            <div className="text-[10px] text-slate-500">Type</div>
                                            <div className="text-sm font-medium" style={{ color: hoveredPoint.color }}>
                                                {hoveredPoint.categoryLabel}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Play Sound Button */}
                                    <button 
                                        onClick={() => playDataSound(hoveredPoint)}
                                        className="w-full mt-2 flex items-center justify-center gap-2 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded transition-colors text-sm font-medium"
                                    >
                                        <IconWrapper name="Volume2" className="w-4 h-4" />
                                        Play Audio Signature
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Scan Toggle */}
                    <div className="pt-4 border-t border-slate-800">
                        <button 
                            onClick={() => setIsScanning(!isScanning)}
                            className="w-full flex items-center justify-center gap-2 py-2 text-xs text-slate-400 hover:text-white border border-slate-700 rounded hover:bg-slate-800 transition-colors"
                        >
                            {isScanning ? <IconWrapper name="Pause" className="w-3 h-3" /> : <IconWrapper name="Play" className="w-3 h-3" />}
                            {isScanning ? 'Stop Radar Sweep' : 'Start Radar Sweep'}
                        </button>
                    </div>
                </div>
            </div>

            {/* --- Right Panel: Visualization --- */}
            <div className="flex-1 relative flex items-center justify-center bg-slate-950 overflow-hidden">
                
                <div 
                    className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                    style={{ 
                        backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', 
                        backgroundSize: '40px 40px' 
                    }}
                ></div>

                <div className="relative w-[600px] h-[600px] lg:w-[700px] lg:h-[700px] flex items-center justify-center select-none">
                    
                    <AnimatePresence>
                        {isScanning && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1, rotate: 360 }}
                                exit={{ opacity: 0 }}
                                transition={{ 
                                    rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                                    opacity: { duration: 0.5 }
                                }}
                                className="absolute inset-0 rounded-full pointer-events-none z-0"
                                style={{
                                    background: 'conic-gradient(from 180deg, transparent 0deg, rgba(6, 182, 212, 0.1) 60deg, rgba(6, 182, 212, 0.4) 90deg, transparent 90.1deg)'
                                }}
                            />
                        )}
                    </AnimatePresence>

                    <svg className="w-full h-full overflow-visible z-10" viewBox="-350 -350 700 700">
                        <g className="origin-center">
                            {rings}
                            {axisLines}

                            {filteredData.map(d => {
                                const pos = getPosition(d.dayIndex, d.timeVal);
                                const size = (d.amplitude / 100) * 8 + 2;
                                
                                return (
                                    <motion.circle
                                        key={d.id}
                                        cx={pos.x}
                                        cy={pos.y}
                                        r={size}
                                        fill={d.color}
                                        fillOpacity={0.7}
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 0.7 }}
                                        whileHover={{ 
                                            scale: 1.5, 
                                            fillOpacity: 1, 
                                            stroke: '#fff', 
                                            strokeWidth: 2 
                                        }}
                                        className="cursor-pointer transition-colors duration-200"
                                        onMouseEnter={() => setHoveredPoint(d)}
                                        onMouseLeave={() => setHoveredPoint(null)}
                                    />
                                );
                            })}

                            <circle r="30" fill="#0f172a" stroke="#334155" strokeWidth="2" />
                            <motion.circle 
                                r="4" 
                                fill="#06b6d4" 
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                        </g>
                    </svg>
                </div>

                <div className="absolute bottom-6 right-6 flex flex-col gap-2 bg-slate-900/80 p-3 rounded-lg border border-slate-800 backdrop-blur-sm text-xs text-slate-400 pointer-events-none">
                    <div className="flex items-center gap-2">
                        <IconWrapper name="Info" className="w-3 h-3" />
                        <span className="font-semibold text-slate-300">Guide</span>
                    </div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-500"></span><span>Rings = Days (Mon → Sun)</span></div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-500"></span><span>Angle = Time (24h)</span></div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-500"></span><span>Size = Amplitude</span></div>
                </div>
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<SonarDashboard />);