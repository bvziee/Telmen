/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ZoomIn, ZoomOut, RotateCcw, ChevronRight, Info, X } from 'lucide-react';
import { BRANCHES, type Branch, type SubNode } from './constants';
import { cn } from './lib/utils';

export default function App() {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());
  const [selectedSubNode, setSelectedSubNode] = useState<{ sub: SubNode; color: string } | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [showGlobalSummary, setShowGlobalSummary] = useState(false);
  const [isGrabbing, setIsGrabbing] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const CX = 1500;
  const CY = 1200;
  const BRANCH_RADIUS = 450;
  const SUB_RADIUS_BASE = 300;
  const SUB_SPREAD = 24;

  useEffect(() => {
    const centerView = () => {
      const containerWidth = window.innerWidth;
      const containerHeight = window.innerHeight;
      setPan({
        x: (containerWidth / 2) - 1500,
        y: (containerHeight / 2) - 1160
      });
    };
    centerView();
    window.addEventListener('resize', centerView);
    return () => window.removeEventListener('resize', centerView);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.node-interactive')) return;
    setIsGrabbing(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isGrabbing) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => setIsGrabbing(false);

  const handleWheel = (e: React.WheelEvent) => {
    const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
    const newScale = Math.max(0.3, Math.min(3, scale * zoomFactor));
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const dx = (mouseX - pan.x) * (newScale / scale - 1);
      const dy = (mouseY - pan.y) * (newScale / scale - 1);
      
      setScale(newScale);
      setPan(prev => ({ x: prev.x - dx, y: prev.y - dy }));
    }
  };

  const toggleBranch = (branch: Branch) => {
    const id = branch.id;
    if (expandedBranches.has(id)) {
      setExpandedBranches(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      setExpandedBranches(prev => new Set(prev).add(id));
      setSelectedBranch(branch);
    }
  };

  const getBranchPos = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: CX + Math.cos(rad) * BRANCH_RADIUS,
      y: CY + Math.sin(rad) * BRANCH_RADIUS
    };
  };

  const getSubPositions = (branch: Branch) => {
    const bPos = getBranchPos(branch.angle);
    const subCount = branch.subs.length;
    const subRadius = SUB_RADIUS_BASE + (subCount > 3 ? (subCount - 3) * 40 : 0);
    const totalSpread = SUB_SPREAD * (subCount - 1);
    const startAngle = branch.angle - totalSpread / 2;

    return branch.subs.map((_, i) => {
      const a = ((startAngle + i * SUB_SPREAD) * Math.PI) / 180;
      return {
        x: bPos.x + Math.cos(a) * subRadius,
        y: bPos.y + Math.sin(a) * subRadius
      };
    });
  };

  const resetView = () => {
    setScale(1);
    setPan({
      x: (window.innerWidth / 2) - 1500,
      y: (window.innerHeight / 2) - 1200
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 overflow-hidden font-sans select-none">
      {/* Title Bar */}
      <header className="relative z-50 bg-slate-900 text-white p-4 shadow-lg flex flex-col items-center">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Бизнесийн философи — Оюуны зураглал</h1>
        <p className="text-xs md:text-sm text-slate-400 italic">Атлантын нуруу тэнийв зохиолын дүрүүд болон үзэл санаатай холбосон</p>
      </header>

      {/* Main Canvas Container */}
      <main 
        ref={containerRef}
        className={cn(
          "flex-1 relative cursor-grab overflow-hidden outline-none",
          isGrabbing && "cursor-grabbing"
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div 
          style={{ 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            width: '3000px',
            height: '2400px',
          }}
          className="absolute top-0 left-0"
        >
          {/* SVG Connectors Layer */}
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible">
            {BRANCHES.map(branch => {
              const bPos = getBranchPos(branch.angle);
              const rad = (branch.angle * Math.PI) / 180;
              const ctrl1X = CX + Math.cos(rad) * 150;
              const ctrl1Y = CY + Math.sin(rad) * 150;
              const ctrl2X = bPos.x - Math.cos(rad) * 100;
              const ctrl2Y = bPos.y - Math.sin(rad) * 100;

              return (
                <React.Fragment key={`conn-${branch.id}`}>
                  {/* Central to Branch */}
                  <path 
                    d={`M ${CX} ${CY} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${bPos.x} ${bPos.y}`}
                    stroke={branch.color}
                    strokeWidth="3.5"
                    fill="none"
                    strokeOpacity="0.5"
                  />
                  
                  {/* Branch to Subs */}
                  <AnimatePresence>
                    {expandedBranches.has(branch.id) && branch.subs.map((sub, i) => {
                      const sPos = getSubPositions(branch)[i];
                      const sRad = ((branch.angle + (i - (branch.subs.length-1)/2) * SUB_SPREAD) * Math.PI) / 180;
                      const sCtrl1X = bPos.x + Math.cos(sRad) * 80;
                      const sCtrl1Y = bPos.y + Math.sin(sRad) * 80;
                      
                      return (
                        <motion.path 
                          key={`subconn-${sub.id}`}
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          exit={{ opacity: 0 }}
                          d={`M ${bPos.x} ${bPos.y} Q ${sCtrl1X} ${sCtrl1Y}, ${sPos.x} ${sPos.y}`}
                          stroke={branch.color}
                          strokeWidth="2"
                          fill="none"
                          strokeOpacity="0.3"
                        />
                      );
                    })}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </svg>

          {/* Central Node */}
          <div 
            style={{ left: CX-110, top: CY-110 }}
            className="absolute z-30 w-[220px] h-[220px] rounded-full bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center text-center p-6 shadow-2xl border-4 border-slate-700/50"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1], rotate: [0, 1, -1, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              className="text-xl font-black leading-tight drop-shadow-md"
            >
              Бизнесийн<br/>философи
            </motion.div>
          </div>

          {/* Branch Nodes */}
          {BRANCHES.map(branch => {
            const pos = getBranchPos(branch.angle);
            const isExpanded = expandedBranches.has(branch.id);

            return (
              <React.Fragment key={branch.id}>
                <div 
                  style={{ left: pos.x-100, top: pos.y-45 }}
                  className="absolute z-20"
                >
                  <motion.button
                    onClick={() => toggleBranch(branch)}
                    whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "node-interactive w-[200px] flex flex-col items-center bg-white rounded-xl shadow-md p-4 border-l-8 transition-shadow relative overflow-hidden",
                      isExpanded ? "shadow-lg ring-1 ring-slate-200" : "shadow-md"
                    )}
                    style={{ borderLeftColor: branch.color }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <ChevronRight className={cn("w-4 h-4 text-slate-400 transition-transform", isExpanded && "rotate-90")} />
                      <span className="text-sm font-bold leading-tight" style={{ color: branch.color }}>
                        {branch.title.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 italic opacity-80">👤 {branch.character}</div>
                    {isExpanded && (
                       <button 
                         onClick={(e) => { e.stopPropagation(); setSelectedBranch(branch); }}
                         className="mt-2 text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-1"
                       >
                         Дүгнэлт харах <Info className="w-2.5 h-2.5"/>
                       </button>
                    )}
                  </motion.button>
                </div>

                {/* Sub Nodes */}
                <AnimatePresence>
                  {isExpanded && branch.subs.map((sub, i) => {
                    const sPos = getSubPositions(branch)[i];
                    return (
                      <motion.div
                        key={sub.id}
                        initial={{ opacity: 0, scale: 0.5, x: pos.x - sPos.x, y: pos.y - sPos.y }}
                        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5, x: pos.x - sPos.x, y: pos.y - sPos.y }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                        style={{ left: sPos.x-90, top: sPos.y-30 }}
                        className="absolute z-10"
                      >
                        <button
                          onClick={() => setSelectedSubNode({ sub, color: branch.color })}
                          className="node-interactive w-[180px] bg-white hover:bg-slate-50 rounded-lg shadow-sm p-3 border-l-4 text-left transition-all hover:shadow-md group"
                          style={{ borderLeftColor: branch.color }}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[12px] font-semibold leading-relaxed text-slate-700">
                              {sub.label.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}
                            </span>
                            <div className="bg-slate-100 p-1 rounded group-hover:bg-slate-200 transition-colors">
                              <Info className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" />
                            </div>
                          </div>
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </React.Fragment>
            );
          })}
        </div>
      </main>

      {/* Floating Controls */}
      <div className="fixed bottom-6 left-6 z-[100] flex flex-col gap-3">
        <button onClick={() => setScale(s => Math.min(s * 1.2, 3))} className="p-3 bg-white rounded-xl shadow-lg hover:bg-slate-50 text-slate-700 transition-all hover:-translate-y-1 active:scale-95 border border-slate-100 flex items-center justify-center"><ZoomIn className="w-5 h-5"/></button>
        <button onClick={() => setScale(s => Math.max(s / 1.2, 0.3))} className="p-3 bg-white rounded-xl shadow-lg hover:bg-slate-50 text-slate-700 transition-all hover:-translate-y-1 active:scale-95 border border-slate-100 flex items-center justify-center"><ZoomOut className="w-5 h-5"/></button>
        <button onClick={resetView} className="p-3 bg-white rounded-xl shadow-lg hover:bg-slate-50 text-slate-700 transition-all hover:-translate-y-1 active:scale-95 border border-slate-100 flex items-center justify-center"><RotateCcw className="w-5 h-5"/></button>
        <button 
          onClick={() => setShowGlobalSummary(true)} 
          className="px-4 py-3 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-slate-800 transition-all hover:-translate-y-1 active:scale-95 font-bold text-xs uppercase tracking-widest flex items-center gap-2"
        >
          <Info className="w-4 h-4"/> Нийт дүгнэлт
        </button>
      </div>

      {/* Legend */}
      <aside className="fixed bottom-6 right-6 z-[100] bg-white/95 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-slate-200 hidden lg:block max-w-[280px]">
        <h3 className="text-sm font-black mb-4 border-b border-slate-100 pb-2 flex items-center gap-2 text-slate-800 uppercase tracking-wider">
          <span className="text-lg">🗺️</span> Салбарууд
        </h3>
        <div className="space-y-3">
          {BRANCHES.map(b => (
            <div key={`legend-${b.id}`} className="flex items-start gap-3">
              <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 animate-pulse" style={{ background: b.color }} />
              <div>
                <button 
                  onClick={() => setSelectedBranch(b)}
                  className="font-bold block text-[11px] text-slate-800 leading-tight text-left hover:underline"
                >
                  {b.title.replace('\n', ' ')}
                </button>
                <span className="text-[10px] text-slate-500 font-medium">{b.character}</span>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedSubNode && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setSelectedSubNode(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-t-[12px]"
              style={{ borderTopColor: selectedSubNode.color }}
            >
              <div className="p-8 md:p-10">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
                    {selectedSubNode.sub.label.replace('\n', ' ')}
                  </h2>
                  <button 
                    onClick={() => setSelectedSubNode(null)}
                    className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-800"
                  >
                    <X className="w-7 h-7" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <section>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                       <span className="text-base">💡</span> Философийн үндэслэл
                    </h3>
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                      <p className="text-slate-700 text-sm md:text-base leading-relaxed font-semibold">
                        {selectedSubNode.sub.philosophyTip}
                      </p>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                       <span className="text-base">📖</span> Зохиол дахь илрэл
                    </h3>
                    <div className="bg-indigo-50/20 rounded-2xl p-5 border border-indigo-100/30">
                      <p className="text-slate-700 text-sm md:text-base leading-relaxed font-medium italic">
                        {selectedSubNode.sub.novelTip}
                      </p>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                       <span className="text-base">💼</span> Бизнестэй холбогдох нь
                    </h3>
                    <div className="bg-emerald-50/30 rounded-2xl p-5 border border-emerald-100/40">
                      <p className="text-emerald-900 text-sm md:text-base leading-relaxed font-bold">
                        {selectedSubNode.sub.businessTip}
                      </p>
                    </div>
                  </section>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: selectedSubNode.color }}>
                    <div className="w-8 h-[2px]" style={{ background: selectedSubNode.color }} />
                    <span>Атлантын нуруу тэнийв</span>
                  </div>
                  <button 
                    onClick={() => setSelectedSubNode(null)}
                    className="px-8 py-3 bg-slate-900 text-white rounded-full font-bold text-sm hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl active:scale-95"
                  >
                    Ойлголоо
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Branch Summary Modal */}
      <AnimatePresence>
        {selectedBranch && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSelectedBranch(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 border-l-[16px]"
              style={{ borderLeftColor: selectedBranch.color }}
            >
              <div className="flex justify-between mb-6">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest" style={{ color: selectedBranch.color }}>
                  {selectedBranch.title.replace('\n', ' ')}: Дүгнэлт
                </h2>
                <button onClick={() => setSelectedBranch(null)}><X className="text-slate-400 hover:text-slate-900"/></button>
              </div>
              <p className="text-slate-700 text-lg leading-relaxed font-medium mb-8">
                {selectedBranch.conclusion}
              </p>
              <button 
                onClick={() => setSelectedBranch(null)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-slate-800 transition-all"
              >
                Хаах
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Summary Modal */}
      <AnimatePresence>
        {showGlobalSummary && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-10">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              onClick={() => setShowGlobalSummary(false)}
            />
            <motion.div
              initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
              className="relative w-full max-w-3xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="bg-slate-900 p-8 md:p-12 text-white flex justify-between items-center">
                <div>
                  <h2 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">Нийтийн дүгнэлт</h2>
                  <p className="text-slate-400 font-medium">Философи болон бизнесийн нэгдэл</p>
                </div>
                <button onClick={() => setShowGlobalSummary(false)} className="p-4 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><X className="w-8 h-8"/></button>
              </div>
              <div className="p-8 md:p-12 max-h-[60vh] overflow-y-auto">
                <div className="prose prose-slate max-w-none space-y-6">
                  <p className="text-xl text-slate-700 leading-relaxed font-semibold border-l-4 border-slate-900 pl-6">
                    Айн Рэндийн Объективизм нь бизнесмэнүүдэд зөвхөн "яаж" ажиллахыг бус, харин "яагаад" ажиллах ёстойг зааж өгдөг. 
                  </p>
                  <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 italic space-y-4">
                    <p className="text-slate-700 leading-relaxed">
                      "Атлантын нуруу тэнийв" зохиолоор дамжуулан бид ертөнцийг үзэх үзэл, соёл иргэншил нь ердөө "оюун ухаан"-аас үүдэлтэй гэдгийг харлаа. Удирдагч хүн өөрийн гэсэн философигүйгээр урт хугацаанд оршин тогтнож чадахгүй.
                    </p>
                    <p className="text-slate-700 leading-relaxed">
                      Энэхүү оюуны зураглалын гол дүгнэлт нь: <strong>Бизнес бол ёс суртахууны хамгийн өндөр хэлбэр юм.</strong> Учир нь тэрээр бүтээмж, ухаан, хариуцлага, сайн дурын харилцаанд тулгуурлаж байж л жинхэнэ утгаараа амжилтад хүрдэг.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                    <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                      <span className="block font-black text-blue-900 mb-2 uppercase text-[10px] tracking-widest">Түлхүүр үг</span>
                      <p className="text-blue-800 font-bold">Оюун ухаан = Амьдрах хэрэгсэл</p>
                    </div>
                    <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <span className="block font-black text-emerald-900 mb-2 uppercase text-[10px] tracking-widest">Үйл ажиллагаа</span>
                      <p className="text-emerald-800 font-bold">Ашиг = Бүтээмжийн хэмжүүр</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-8 md:p-12 bg-slate-50 flex justify-center">
                <button 
                  onClick={() => setShowGlobalSummary(false)}
                  className="px-12 py-4 bg-slate-900 text-white rounded-full font-black text-sm uppercase tracking-[0.4em] hover:bg-slate-800 transition-all shadow-xl hover:-translate-y-1"
                >
                  Ойлголоо
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
