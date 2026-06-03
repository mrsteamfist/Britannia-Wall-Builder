import { useReducer, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gameReducer, useGameState } from "../game/gameState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WallSegment } from "@/components/game/WallSegment";
import { WorkerPiece } from "@/components/game/WorkerPiece";
import { SoldierPiece } from "@/components/game/SoldierPiece";
import { PictWarrior } from "@/components/game/PictWarrior";

export default function Game() {
  const [state, dispatch] = useReducer(gameReducer, useGameState());
  const [showInstructions, setShowInstructions] = useState(true);

  return (
    <div className="min-h-dvh w-full flex flex-col bg-background text-foreground font-sans overflow-hidden">
      
      {/* Top Bar */}
      <header className="p-4 border-b-4 border-border flex justify-between items-center bg-card shadow-md">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-serif text-primary uppercase tracking-widest font-bold drop-shadow-sm">Hadrian's Wall</h1>
          <span className="text-xl font-serif text-muted">Year {state.turn}</span>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold uppercase tracking-wider">City Health</span>
            <div className="flex gap-1 mt-1">
              {[...Array(state.maxCityHealth)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`w-4 h-6 border-2 border-border ${i < state.cityHealth ? 'bg-primary' : 'bg-transparent'}`}
                  initial={false}
                  animate={{ backgroundColor: i < state.cityHealth ? "hsl(var(--primary))" : "transparent" }}
                  transition={{ duration: 0.3 }}
                  data-testid={`health-bar-${i}`}
                />
              ))}
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold uppercase tracking-wider text-destructive flex items-center gap-2">
              Pict Attack
            </span>
            <motion.div 
              key={state.pictAttack}
              initial={{ scale: 1.5, color: "hsl(var(--destructive))" }}
              animate={{ scale: 1, color: "hsl(var(--foreground))" }}
              className="text-2xl font-serif font-bold text-destructive flex items-center gap-2"
              data-testid="pict-attack"
            >
              <PictWarrior className="w-6 h-6 text-destructive" />
              {state.pictAttack}
            </motion.div>
          </div>
        </div>
      </header>

      {/* Main Board */}
      <main className="flex-1 flex flex-col p-6 gap-6 max-w-6xl mx-auto w-full relative z-10">
        
        {/* Wall Display */}
        <section className="flex flex-col items-center">
          <h2 className="text-xl font-serif mb-2 tracking-widest">The Great Wall</h2>
          <div className="flex gap-2 p-4 border-4 border-border bg-card/50 shadow-inner rounded-sm" data-testid="wall-display">
            {[...Array(state.maxWallPieces)].map((_, i) => (
              <div key={i} className="w-24 h-32 relative">
                <WallSegment built={i < state.wallPieces} className="w-full h-full text-secondary" />
              </div>
            ))}
          </div>
        </section>

        {/* Middle Section: Garrison & Workers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="col-span-2 border-4 border-border rounded-none shadow-md">
            <CardHeader className="border-b-2 border-border bg-muted/20">
              <CardTitle className="font-serif tracking-widest text-center text-xl">Allocate Citizens</CardTitle>
              <div className="text-center font-bold" data-testid="available-workers">
                Available: {state.availableWorkers} / {state.totalWorkers}
              </div>
            </CardHeader>
            <CardContent className="p-4 flex gap-4 justify-around">
              {/* Fight Card */}
              <div className="flex-1 border-2 border-border p-4 flex flex-col items-center bg-background/50">
                <SoldierPiece className="w-12 h-12 mb-2 text-destructive" />
                <h3 className="font-serif font-bold text-lg mb-2 text-destructive">Fight</h3>
                <p className="text-sm mb-4 text-center">x2 Defense</p>
                <div className="text-3xl font-serif mb-4" data-testid="alloc-fight">{state.allocations.fight}</div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => dispatch({type:'DEALLOCATE_WORKER', task:'fight'})} disabled={state.allocations.fight === 0} data-testid="btn-sub-fight">-</Button>
                  <Button size="sm" onClick={() => dispatch({type:'ALLOCATE_WORKER', task:'fight'})} disabled={state.availableWorkers === 0} data-testid="btn-add-fight">+</Button>
                </div>
              </div>

              {/* Build Card */}
              <div className="flex-1 border-2 border-border p-4 flex flex-col items-center bg-background/50">
                <WorkerPiece className="w-12 h-12 mb-2 text-secondary" />
                <h3 className="font-serif font-bold text-lg mb-2 text-secondary">Build</h3>
                <p className="text-sm mb-4 text-center">+1 Wall Piece</p>
                <div className="text-3xl font-serif mb-4" data-testid="alloc-build">{state.allocations.build}</div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => dispatch({type:'DEALLOCATE_WORKER', task:'build'})} disabled={state.allocations.build === 0} data-testid="btn-sub-build">-</Button>
                  <Button size="sm" onClick={() => dispatch({type:'ALLOCATE_WORKER', task:'build'})} disabled={state.availableWorkers === 0} data-testid="btn-add-build">+</Button>
                </div>
              </div>

              {/* Recruit Card */}
              <div className="flex-1 border-2 border-border p-4 flex flex-col items-center bg-background/50">
                <SoldierPiece className="w-12 h-12 mb-2 text-primary" />
                <h3 className="font-serif font-bold text-lg mb-2 text-primary">Recruit</h3>
                <p className="text-sm mb-4 text-center">+1 Garrison</p>
                <div className="text-3xl font-serif mb-4" data-testid="alloc-recruit">{state.allocations.recruit}</div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => dispatch({type:'DEALLOCATE_WORKER', task:'recruit'})} disabled={state.allocations.recruit === 0} data-testid="btn-sub-recruit">-</Button>
                  <Button size="sm" onClick={() => dispatch({type:'ALLOCATE_WORKER', task:'recruit'})} disabled={state.availableWorkers === 0} data-testid="btn-add-recruit">+</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <Card className="border-4 border-border rounded-none shadow-md flex-1">
              <CardHeader className="p-4 border-b-2 border-border bg-muted/20">
                <CardTitle className="font-serif tracking-wider text-lg">Garrison Troops</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2 justify-center mb-4">
                  {state.garrisonTroops === 0 && <span className="text-sm italic opacity-50">No garrison</span>}
                  {[...Array(state.garrisonTroops)].map((_, i) => (
                    <SoldierPiece key={i} className="w-6 h-6 text-primary" />
                  ))}
                </div>
                <div className="text-4xl font-serif text-center mb-2" data-testid="garrison-troops">{state.garrisonTroops}</div>
                <p className="text-sm text-center">Permanent defense force.</p>
              </CardContent>
            </Card>

            <Button 
              size="lg" 
              className="w-full text-xl font-serif uppercase tracking-widest h-16 border-4 border-primary hover:bg-primary/90 rounded-none shadow-md"
              onClick={() => dispatch({type:'END_TURN'})}
              data-testid="btn-end-turn"
            >
              End Turn
            </Button>
          </div>
        </div>

        {/* Battle Log */}
        <Card className="border-4 border-border rounded-none shadow-md mt-auto">
          <CardHeader className="p-3 border-b-2 border-border bg-muted/20">
            <CardTitle className="font-serif tracking-widest text-lg">Annals of Britannia</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-32 p-4">
              <div className="flex flex-col gap-2">
                {[...state.battleLog].reverse().map((log, i) => (
                  <div key={i} className={`text-sm font-serif ${i===0 ? 'font-bold text-base text-foreground' : 'opacity-70'}`}>
                    {log}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>

      {/* Win/Loss Overlays */}
      <AnimatePresence>
        {state.status !== 'playing' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${state.status === 'win' ? 'bg-secondary/90' : 'bg-destructive/95'}`}
          >
            <div className="max-w-md w-full bg-background border-8 border-border p-8 text-center shadow-2xl">
              <h2 className="text-4xl font-serif mb-4 uppercase tracking-widest text-primary">
                {state.status === 'win' ? 'Roma Victrix!' : 'Defeat'}
              </h2>
              <p className="text-xl font-serif mb-8 italic">
                {state.status === 'win' 
                  ? "The Wall stands eternal. The province is safe under your rule." 
                  : "The Picts have overrun Eboracum! The province is lost to the savages."}
              </p>
              <div className="flex justify-center">
                <Button size="lg" className="rounded-none border-2 border-border font-serif text-lg tracking-wider" onClick={() => dispatch({type:'RESTART'})} data-testid="btn-restart">
                  {state.status === 'win' ? 'Govern Again' : 'Try Again'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="border-4 border-border rounded-none bg-background max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-primary text-center">Governor's Mandate</DialogTitle>
          </DialogHeader>
          <div className="font-serif space-y-4 text-base leading-relaxed">
            <p>Welcome to Britannia, Governor. Your task is to build Hadrian's Wall before the Picts destroy Eboracum.</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Fight:</strong> Each citizen assigned grants 2 temporary defense for this turn.</li>
              <li><strong>Build:</strong> Each citizen assigned builds 1 piece of the wall. Build 6 to win.</li>
              <li><strong>Recruit:</strong> Each citizen trains a permanent soldier (+1 passive defense forever).</li>
            </ul>
            <p className="text-destructive font-bold">Beware: The Pictish attack grows stronger every year.</p>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowInstructions(false)} className="rounded-none font-serif tracking-widest" data-testid="btn-dismiss-instructions">I Understand</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}