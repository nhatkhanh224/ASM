"use client";

import React, { useRef, useState, useEffect } from "react";
import { X, Download, Loader2, Check } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssetWithRate {
  _id: string;
  name: string;
  type: string;
  originalValue: number;
  currency: string;
  value: number;
  currentValueInVND: number;
}

interface Snapshot { month: string; totalVND: number; }

interface ShareCardProps {
  assetsWithRate: AssetWithRate[];
  exchangeRates: Record<string, number>;
  onClose: () => void;
}

// ─── Themes ───────────────────────────────────────────────────────────────────

const THEMES = [
  { id: "midnight", label: "Midnight", bg: ["#0f0c29","#1a1a2e","#16213e"], accent: "#7c6fff", accentRgb: "124,111,255", text: "#ffffff", subtext: "rgba(200,195,255,0.6)", positive: "#4ade80", negative: "#f87171", barBg: "rgba(255,255,255,0.08)", btnDark: false },
  { id: "aurora",   label: "Aurora",   bg: ["#0d1117","#0a2a1f","#001a33"], accent: "#00e5a0", accentRgb: "0,229,160",   text: "#ffffff", subtext: "rgba(160,230,200,0.55)", positive: "#34d399", negative: "#fb7185", barBg: "rgba(255,255,255,0.07)", btnDark: true  },
  { id: "solar",    label: "Solar",    bg: ["#1a0a00","#2d1200","#1a0d00"], accent: "#ff9500", accentRgb: "255,149,0",   text: "#fff8f0", subtext: "rgba(255,200,130,0.55)", positive: "#fbbf24", negative: "#f87171", barBg: "rgba(255,255,255,0.07)", btnDark: true  },
  { id: "pearl",    label: "Pearl",    bg: ["#f8f9ff","#eef0f8","#f0f4ff"], accent: "#4f46e5", accentRgb: "79,70,229",   text: "#1e1b4b", subtext: "rgba(79,70,229,0.5)",    positive: "#059669", negative: "#dc2626", barBg: "rgba(79,70,229,0.07)",   btnDark: false },
  { id: "obsidian", label: "Obsidian", bg: ["#0a0a0a","#111111","#0d0d0d"], accent: "#e2e2e2", accentRgb: "226,226,226", text: "#f5f5f5", subtext: "rgba(200,200,200,0.45)", positive: "#86efac", negative: "#fca5a5", barBg: "rgba(255,255,255,0.06)", btnDark: true  },
  { id: "sakura",   label: "Sakura",   bg: ["#1a0010","#2d0020","#150018"], accent: "#ff6eb4", accentRgb: "255,110,180", text: "#fff0f8", subtext: "rgba(255,180,220,0.55)", positive: "#f9a8d4", negative: "#fca5a5", barBg: "rgba(255,255,255,0.07)", btnDark: false },
] as const;

type ThemeId = typeof THEMES[number]["id"];

const TEMPLATES = [
  { id: "classic", label: "Classic", icon: "◼" },
  { id: "minimal", label: "Minimal", icon: "◻" },
  { id: "bold",    label: "Bold",    icon: "◆" },
] as const;

type TemplateId = typeof TEMPLATES[number]["id"];

// ─── Data maps ────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string,string> = { cash:"Tiền mặt", bank:"Ngân hàng", investment:"Đầu tư", property:"BĐS", digital:"Tài sản số", other:"Khác" };
const TYPE_COLOR: Record<string,string> = { cash:"#10b981", bank:"#3b82f6", investment:"#a855f7", property:"#f97316", digital:"#06b6d4", other:"#6b7280" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtVND(v: number) {
  if (v >= 1_000_000_000_000) return `${(v/1_000_000_000_000).toFixed(2)} nghìn tỷ`;
  if (v >= 1_000_000_000)     return `${(v/1_000_000_000).toFixed(2)} tỷ`;
  if (v >= 1_000_000)         return `${(v/1_000_000).toFixed(1)} tr`;
  return v.toLocaleString("vi-VN");
}
function fmtUSD(v: number) {
  if (v >= 1_000_000) return `$${(v/1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${(v/1_000).toFixed(1)}K`;
  return `$${v.toLocaleString("en-US",{maximumFractionDigits:0})}`;
}
function fmtDate(d: Date) {
  return d.toLocaleDateString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric"});
}

// Canvas helpers
function rr(ctx: CanvasRenderingContext2D, x:number, y:number, w:number, h:number, r:number) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

function parseColor(c: string): [number,number,number,number] {
  // parse hex or rgba(r,g,b,a)
  if (c.startsWith("#")) {
    const n = parseInt(c.slice(1),16);
    if (c.length === 7) return [(n>>16)&255,(n>>8)&255,n&255,1];
    return [(n>>16)&255,(n>>8)&255,n&255,1];
  }
  const m = c.match(/[\d.]+/g);
  if (m) return [+m[0],+m[1],+m[2],m[3]!=null?+m[3]:1];
  return [128,128,128,1];
}

function applyAlpha(ctx: CanvasRenderingContext2D, color: string, alpha = 1) {
  const [r,g,b,a] = parseColor(color);
  ctx.globalAlpha = a * alpha;
  return `rgb(${r},${g},${b})`;
}

// ─── Core draw function ───────────────────────────────────────────────────────

function drawCard(
  canvas: HTMLCanvasElement,
  assets: AssetWithRate[],
  rates: Record<string,number>,
  theme: typeof THEMES[number],
  template: TemplateId,
  snap: Snapshot | null,
  scale = 2,
) {
  const W = 800;
  const H = template === "minimal" ? 510 : 560;
  canvas.width  = W * scale;
  canvas.height = H * scale;
  canvas.style.width  = W + "px";
  canvas.style.height = H + "px";

  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  const t = theme;
  const usd = rates["USD"] || 26200;
  const totalVND = assets.reduce((s,a) => s + a.currentValueInVND, 0);
  const totalUSD = totalVND / usd;
  const growth = snap && snap.totalVND > 0 ? ((totalVND - snap.totalVND) / snap.totalVND) * 100 : null;

  const byType = assets.reduce<Record<string,number>>((acc,a) => {
    acc[a.type] = (acc[a.type]??0) + a.currentValueInVND; return acc;
  }, {});
  const typeRows = Object.entries(byType).sort(([,a],[,b])=>b-a).slice(0,5);
  const cryptos  = assets.filter(a=>a.currency!=="VND"&&a.currency!=="USD").sort((a,b)=>b.currentValueInVND-a.currentValueInVND).slice(0,4);

  // ── Background ──
  const bgGrad = ctx.createLinearGradient(0,0,W,H);
  bgGrad.addColorStop(0,  t.bg[0]);
  bgGrad.addColorStop(.5, t.bg[1]);
  bgGrad.addColorStop(1,  t.bg[2]);
  rr(ctx,0,0,W,H,24);
  ctx.fillStyle = bgGrad; ctx.fill();

  // glow orb
  const orb = ctx.createRadialGradient(W-100,80,0,W-100,80,220);
  orb.addColorStop(0,`rgba(${t.accentRgb},0.1)`);
  orb.addColorStop(1,"transparent");
  ctx.fillStyle = orb; ctx.fillRect(0,0,W,H);

  ctx.globalAlpha = 1;
  const PX = 52; // padding

  // ════════════════════════════════════════
  // CLASSIC
  // ════════════════════════════════════════
  if (template === "classic") {
    // Logo box
    rr(ctx, PX, 44, 42, 42, 11);
    ctx.fillStyle = t.accent; ctx.fill();
    ctx.font = "bold 20px Georgia,serif";
    ctx.fillStyle = t.btnDark ? "#000" : "#fff";
    ctx.textAlign = "center";
    ctx.fillText("K", PX+21, 44+28);

    // Brand
    ctx.textAlign = "left";
    ctx.font = "700 15px Arial,sans-serif";
    ctx.fillStyle = t.text;
    ctx.globalAlpha = 1;
    ctx.fillText("KVAULT", PX+56, 44+16);
    ctx.font = "400 10px Arial,sans-serif";
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = t.text;
    ctx.fillText("PORTFOLIO SNAPSHOT", PX+56, 44+30);
    ctx.globalAlpha = 1;

    // Date
    ctx.textAlign = "right";
    ctx.font = "400 12px Arial,sans-serif";
    ctx.fillStyle = t.subtext;
    ctx.globalAlpha = 1;
    ctx.fillText(fmtDate(new Date()), W-PX, 62);

    // Growth badge
    if (growth !== null) {
      const badge = `${growth>=0?"▲":"▼"} ${Math.abs(growth).toFixed(1)}% MoM`;
      ctx.font = "700 10px Arial,sans-serif";
      const bw = ctx.measureText(badge).width + 22;
      const bx = W-PX-bw, by = 70;
      rr(ctx,bx,by,bw,20,10);
      ctx.fillStyle = growth>=0?"rgba(74,222,128,0.15)":"rgba(248,113,113,0.15)"; ctx.fill();
      ctx.strokeStyle = growth>=0?"rgba(74,222,128,0.4)":"rgba(248,113,113,0.4)";
      ctx.lineWidth=1; ctx.stroke();
      ctx.fillStyle = growth>=0?t.positive:t.negative;
      ctx.textAlign="center";
      ctx.fillText(badge, bx+bw/2, by+13);
    }
    ctx.globalAlpha=1; ctx.textAlign="left";

    // Section label
    ctx.font = "500 10px Arial,sans-serif";
    ctx.fillStyle = t.subtext;
    ctx.fillText("TỔNG TÀI SẢN", PX, 138);

    // Big number
    ctx.font = "800 58px Georgia,serif";
    ctx.fillStyle = t.text;
    ctx.fillText(fmtVND(totalVND), PX, 206);
    const nw = ctx.measureText(fmtVND(totalVND)).width;
    ctx.font = "300 17px Arial,sans-serif";
    ctx.fillStyle = t.subtext;
    ctx.fillText(" VND", PX+nw+2, 200);

    ctx.font = "400 13px Arial,sans-serif";
    ctx.fillStyle = t.subtext;
    ctx.fillText(`≈ ${fmtUSD(totalUSD)}`, PX, 226);

    // Divider
    ctx.strokeStyle = `rgba(${t.accentRgb},0.2)`; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(PX,246); ctx.lineTo(W-PX,246); ctx.stroke();

    // ─ Left col: allocation
    const colW = (W-PX*2-28)/2;
    ctx.font = "600 10px Arial,sans-serif";
    ctx.fillStyle = t.subtext;
    ctx.fillText("PHÂN BỔ DANH MỤC", PX, 274);

    let ry = 292;
    typeRows.forEach(([type,val]) => {
      const pct = totalVND>0?(val/totalVND)*100:0;
      const col = TYPE_COLOR[type]??t.accent;
      ctx.beginPath(); ctx.arc(PX+5,ry+5,4,0,Math.PI*2);
      ctx.fillStyle=col; ctx.fill();
      ctx.font="400 12px Arial,sans-serif";
      ctx.fillStyle=t.text; ctx.globalAlpha=0.85;
      ctx.fillText(TYPE_LABEL[type]??type, PX+16, ry+9);
      ctx.globalAlpha=1;
      ctx.font="700 12px Arial,sans-serif";
      ctx.fillStyle=t.accent; ctx.textAlign="right";
      ctx.fillText(`${pct.toFixed(0)}%`, PX+colW, ry+9);
      ctx.textAlign="left";
      // bar track
      rr(ctx,PX,ry+14,colW,4,2);
      ctx.fillStyle=t.barBg; ctx.fill();
      // bar fill
      if (pct>0){ rr(ctx,PX,ry+14,(colW*pct)/100,4,2); ctx.fillStyle=col; ctx.fill(); }
      ry+=35;
    });

    // ─ Right col: crypto
    const c2 = PX+colW+28;
    ctx.font="600 10px Arial,sans-serif"; ctx.fillStyle=t.subtext;
    ctx.fillText(cryptos.length>0?"CRYPTO ĐANG HOLD":"TOP TÀI SẢN", c2, 274);

    let cy = 292;
    (cryptos.length>0?cryptos:assets.slice(0,4)).forEach(a=>{
      const priceUSD = (rates[a.currency.toUpperCase()]??0)/usd;
      const pctT = totalVND>0?(a.currentValueInVND/totalVND)*100:0;
      rr(ctx,c2,cy,30,26,7);
      ctx.fillStyle=`rgba(${t.accentRgb},0.15)`; ctx.fill();
      ctx.strokeStyle=`rgba(${t.accentRgb},0.25)`; ctx.lineWidth=1; ctx.stroke();
      ctx.font="800 8px Arial,sans-serif"; ctx.fillStyle=t.accent;
      ctx.textAlign="center"; ctx.fillText(a.currency.slice(0,4), c2+15, cy+16); ctx.textAlign="left";
      ctx.font="600 12px Arial,sans-serif"; ctx.fillStyle=t.text; ctx.globalAlpha=0.9;
      ctx.fillText(a.currency.toUpperCase(), c2+38, cy+10);
      if(priceUSD>0){ ctx.font="400 10px Arial,sans-serif"; ctx.fillStyle=t.subtext; ctx.globalAlpha=1; ctx.fillText(fmtUSD(priceUSD),c2+38,cy+22); }
      ctx.globalAlpha=1;
      ctx.font="700 12px Arial,sans-serif"; ctx.fillStyle=t.text; ctx.textAlign="right";
      ctx.fillText(fmtVND(a.currentValueInVND), W-PX, cy+10);
      ctx.font="400 10px Arial,sans-serif"; ctx.fillStyle=t.subtext;
      ctx.fillText(`${pctT.toFixed(1)}%`, W-PX, cy+22);
      ctx.textAlign="left"; cy+=35;
    });

    // Footer
    const fy=H-44;
    ctx.strokeStyle=`rgba(${t.accentRgb},0.2)`; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(PX,fy); ctx.lineTo(W-PX,fy); ctx.stroke();
    ctx.font="400 10px Arial,sans-serif"; ctx.fillStyle=t.subtext;
    ctx.fillText("MADE WITH KVAULT", PX, fy+18);
    for(let i=0;i<6;i++){
      ctx.beginPath(); ctx.arc(W-PX-(5-i)*11,fy+12,3,0,Math.PI*2);
      ctx.fillStyle=i<4?t.accent:t.barBg; ctx.globalAlpha=i<4?Math.max(0.2,0.7-i*0.15):0.3; ctx.fill();
    }
    ctx.globalAlpha=1;
    return;
  }

  // ════════════════════════════════════════
  // MINIMAL
  // ════════════════════════════════════════
  if (template === "minimal") {
    // Top line
    const lg = ctx.createLinearGradient(PX,0,W-PX,0);
    lg.addColorStop(0,"transparent"); lg.addColorStop(.5,t.accent); lg.addColorStop(1,"transparent");
    ctx.fillStyle=lg; ctx.fillRect(PX,0,W-PX*2,3);

    // Sidebar bar
    rr(ctx,PX,42,6,30,3); ctx.fillStyle=t.accent; ctx.fill();

    ctx.font="300 12px Arial,sans-serif"; ctx.fillStyle=t.text; ctx.globalAlpha=0.65;
    ctx.fillText("KVAULT", PX+18, 62); ctx.globalAlpha=1;

    ctx.textAlign="right"; ctx.font="400 12px Arial,sans-serif"; ctx.fillStyle=t.subtext;
    ctx.fillText(fmtDate(new Date()), W-PX, 62); ctx.textAlign="left";

    ctx.font="400 10px Arial,sans-serif"; ctx.fillStyle=t.subtext;
    ctx.fillText("NET WORTH", PX, 112);

    ctx.font="900 72px Georgia,serif"; ctx.fillStyle=t.text;
    ctx.fillText(fmtVND(totalVND), PX, 196);
    const bw2=ctx.measureText(fmtVND(totalVND)).width;
    ctx.font="300 20px Arial,sans-serif"; ctx.fillStyle=t.subtext;
    ctx.fillText(" VND", PX+bw2+4, 188);

    ctx.font="400 14px Arial,sans-serif"; ctx.fillStyle=t.subtext;
    ctx.fillText(`≈ ${fmtUSD(totalUSD)}`, PX, 222);
    if(growth!==null){
      const gw=ctx.measureText(`≈ ${fmtUSD(totalUSD)}`).width;
      ctx.font="600 13px Arial,sans-serif";
      ctx.fillStyle=growth>=0?t.positive:t.negative;
      ctx.fillText(`  ${growth>=0?"↑":"↓"} ${Math.abs(growth).toFixed(1)}% tháng trước`, PX+gw, 222);
    }

    // Stacked bar
    const bY=250, bTW=W-PX*2;
    let bx=PX;
    typeRows.forEach(([type,val])=>{
      const pct=totalVND>0?(val/totalVND)*100:0;
      const sw=(bTW*pct)/100;
      ctx.fillStyle=TYPE_COLOR[type]??t.accent;
      ctx.fillRect(bx,bY,Math.max(sw-2,0),8); bx+=sw;
    });

    // Legend
    let lx=PX;
    typeRows.forEach(([type,val])=>{
      const pct=totalVND>0?(val/totalVND)*100:0;
      ctx.beginPath(); ctx.arc(lx+4,274,4,0,Math.PI*2);
      ctx.fillStyle=TYPE_COLOR[type]??t.accent; ctx.fill();
      ctx.font="400 11px Arial,sans-serif"; ctx.fillStyle=t.subtext;
      ctx.fillText(TYPE_LABEL[type]??type, lx+12, 278);
      const lw=ctx.measureText(TYPE_LABEL[type]??type).width;
      ctx.font="600 11px Arial,sans-serif"; ctx.fillStyle=t.text;
      ctx.fillText(` ${pct.toFixed(0)}%`, lx+12+lw, 278);
      lx+=ctx.measureText(`${TYPE_LABEL[type]??type} ${pct.toFixed(0)}%`).width+28;
    });

    // Chips
    if(cryptos.length>0){
      const cY=308, cW=(W-PX*2-(cryptos.length-1)*12)/cryptos.length;
      cryptos.forEach((a,i)=>{
        const cx=PX+i*(cW+12);
        rr(ctx,cx,cY,cW,62,12);
        ctx.fillStyle=`rgba(${t.accentRgb},0.12)`; ctx.fill();
        ctx.strokeStyle=`rgba(${t.accentRgb},0.22)`; ctx.lineWidth=1; ctx.stroke();
        ctx.font="700 10px Arial,sans-serif"; ctx.fillStyle=t.accent;
        ctx.fillText(a.currency.toUpperCase(), cx+14, cY+20);
        ctx.font="700 15px Georgia,serif"; ctx.fillStyle=t.text;
        ctx.fillText(fmtVND(a.currentValueInVND), cx+14, cY+44);
      });
    }

    // Footer
    ctx.strokeStyle=`rgba(${t.accentRgb},0.2)`; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(PX,H-26); ctx.lineTo(W-PX-90,H-26); ctx.stroke();
    ctx.font="400 10px Arial,sans-serif"; ctx.fillStyle=t.subtext; ctx.textAlign="right";
    ctx.fillText("KVAULT.APP", W-PX, H-12);
    ctx.textAlign="left";
    return;
  }

  // ════════════════════════════════════════
  // BOLD
  // ════════════════════════════════════════
  // Top bar
  const bb=ctx.createLinearGradient(0,0,W*.65,0);
  bb.addColorStop(0,t.accent); bb.addColorStop(1,`rgba(${t.accentRgb},0.05)`);
  ctx.fillStyle=bb; ctx.fillRect(0,0,W,7);

  // Badge
  ctx.font="700 10px Arial,sans-serif";
  const bt=`KVault · ${fmtDate(new Date())}`;
  const btw=ctx.measureText(bt).width+24;
  rr(ctx,PX,32,btw,22,11);
  ctx.fillStyle=`rgba(${t.accentRgb},0.15)`; ctx.fill();
  ctx.strokeStyle=`rgba(${t.accentRgb},0.25)`; ctx.lineWidth=1; ctx.stroke();
  ctx.fillStyle=t.accent; ctx.fillText(bt, PX+12, 32+14);

  ctx.font="300 12px Arial,sans-serif"; ctx.fillStyle=t.text; ctx.globalAlpha=0.5;
  ctx.fillText("PORTFOLIO STATEMENT", PX, 74); ctx.globalAlpha=1;

  // Growth right
  if(growth!==null){
    ctx.font="900 46px Georgia,serif";
    ctx.fillStyle=growth>=0?t.positive:t.negative; ctx.textAlign="right";
    ctx.fillText(`${growth>=0?"+":""}${growth.toFixed(1)}%`, W-PX, 74);
    ctx.font="400 10px Arial,sans-serif"; ctx.fillStyle=t.subtext;
    ctx.fillText("VS. THÁNG TRƯỚC", W-PX, 88);
    ctx.textAlign="left";
  }

  ctx.font="400 10px Arial,sans-serif"; ctx.fillStyle=t.subtext;
  ctx.fillText("TỔNG TÀI SẢN RÒNG", PX, 112);

  ctx.font="900 64px Georgia,serif"; ctx.fillStyle=t.text;
  ctx.fillText(fmtVND(totalVND), PX, 186);
  const gnw=ctx.measureText(fmtVND(totalVND)).width;
  ctx.font="400 20px Arial,sans-serif"; ctx.fillStyle=t.subtext; ctx.globalAlpha=0.45;
  ctx.fillText(" VND", PX+gnw+4, 180); ctx.globalAlpha=1;

  rr(ctx,PX,196,100,4,2); ctx.fillStyle=t.accent; ctx.fill();

  ctx.font="400 14px Arial,sans-serif"; ctx.fillStyle=t.subtext;
  ctx.fillText(`≈ ${fmtUSD(totalUSD)}`, PX, 222);

  // Stats grid
  const gW=(W-PX*2-16*2)/3;
  typeRows.slice(0,3).forEach(([type,val],i)=>{
    const pct=totalVND>0?(val/totalVND)*100:0;
    const gx=PX+i*(gW+16), gy=244;
    rr(ctx,gx,gy,gW,80,14);
    ctx.fillStyle=t.barBg; ctx.fill();
    ctx.strokeStyle=`rgba(${t.accentRgb},0.15)`; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle=TYPE_COLOR[type]??t.accent;
    rr(ctx,gx,gy+76,gW,4,2); ctx.fill();
    ctx.font="400 10px Arial,sans-serif"; ctx.fillStyle=t.subtext;
    ctx.fillText((TYPE_LABEL[type]??type).toUpperCase(), gx+14, gy+18);
    ctx.font="800 25px Georgia,serif"; ctx.fillStyle=t.text;
    ctx.fillText(`${pct.toFixed(0)}%`, gx+14, gy+50);
    ctx.font="400 10px Arial,sans-serif"; ctx.fillStyle=t.subtext;
    ctx.fillText(fmtVND(val), gx+14, gy+66);
  });

  // Chips
  if(cryptos.length>0){
    let cx2=PX;
    cryptos.forEach(a=>{
      const lbl=`${a.currency.toUpperCase()}  ${fmtVND(a.currentValueInVND)}`;
      ctx.font="700 11px Arial,sans-serif";
      const cw=ctx.measureText(lbl).width+28;
      rr(ctx,cx2,348,cw,30,15);
      ctx.fillStyle=`rgba(${t.accentRgb},0.13)`; ctx.fill();
      ctx.strokeStyle=`rgba(${t.accentRgb},0.22)`; ctx.lineWidth=1; ctx.stroke();
      ctx.fillStyle=t.accent; ctx.fillText(a.currency.toUpperCase(), cx2+14, 348+19);
      const sw=ctx.measureText(a.currency.toUpperCase()).width;
      ctx.font="400 11px Arial,sans-serif"; ctx.fillStyle=t.subtext;
      ctx.fillText(`  ${fmtVND(a.currentValueInVND)}`, cx2+14+sw, 348+19);
      cx2+=cw+8;
    });
  }

  // Footer
  ctx.strokeStyle=`rgba(${t.accentRgb},0.2)`; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(PX,H-44); ctx.lineTo(W-PX,H-44); ctx.stroke();
  ctx.font="400 10px Arial,sans-serif"; ctx.fillStyle=t.subtext;
  ctx.fillText("POWERED BY KVAULT", PX, H-44+18);
  rr(ctx,W-PX-30,H-44+2,30,30,8); ctx.fillStyle=t.accent; ctx.fill();
  ctx.font="900 15px Georgia,serif"; ctx.fillStyle=t.btnDark?"#000":"#fff";
  ctx.textAlign="center"; ctx.fillText("K",W-PX-15,H-44+22); ctx.textAlign="left";
}

// ─── Preview canvas component ─────────────────────────────────────────────────

function Preview({ assets, rates, theme, template, snap }: {
  assets: AssetWithRate[]; rates: Record<string,number>;
  theme: typeof THEMES[number]; template: TemplateId; snap: Snapshot|null;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{ if(ref.current) drawCard(ref.current,assets,rates,theme,template,snap,2); },[assets,rates,theme,template,snap]);
  return <canvas ref={ref} style={{ width:"100%", height:"auto", display:"block", borderRadius:14 }} />;
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function ShareCard({ assetsWithRate, exchangeRates, onClose }: ShareCardProps) {
  const [exporting, setExporting] = useState(false);
  const [exported,  setExported]  = useState(false);
  const [snap, setSnap] = useState<Snapshot|null>(null);
  const [themeId,   setThemeId]   = useState<ThemeId>("midnight");
  const [templateId,setTemplateId]= useState<TemplateId>("classic");

  useEffect(()=>{
    fetch("/api/snapshots").then(r=>r.json()).then((d:Snapshot[])=>{
      if(Array.isArray(d)&&d.length>=2){
        const s=[...d].sort((a,b)=>a.month.localeCompare(b.month));
        setSnap(s[s.length-2]??null);
      }
    }).catch(()=>{});
  },[]);

  const theme = THEMES.find(t=>t.id===themeId)??THEMES[0];

  const handleExport = async () => {
    setExporting(true);
    try {
      const off = document.createElement("canvas");
      drawCard(off, assetsWithRate, exchangeRates, theme, templateId, snap, 3);
      const link = document.createElement("a");
      link.download = `kvault-${themeId}-${templateId}-${new Date().toISOString().slice(0,10)}.png`;
      link.href = off.toDataURL("image/png");
      link.click();
      setExported(true);
      setTimeout(()=>setExported(false),2000);
    } catch(e){ console.error(e); alert("Lỗi xuất ảnh!"); }
    finally{ setExporting(false); }
  };

  return (
    <div style={{position:"fixed",inset:0,zIndex:50,background:"rgba(0,0,0,0.82)",backdropFilter:"blur(14px)",overflowY:"auto",padding:"24px 16px"}}>
      <div style={{maxWidth:760,margin:"0 auto",display:"flex",flexDirection:"column",gap:16}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h2 style={{color:"#fff",fontWeight:600,fontSize:16,margin:0}}>Tạo ảnh chia sẻ</h2>
          <button onClick={onClose} style={{width:36,height:36,borderRadius:12,background:"rgba(255,255,255,0.15)",border:"none",cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <X style={{width:16,height:16}}/>
          </button>
        </div>

        {/* Template */}
        <div style={{background:"rgba(255,255,255,0.07)",borderRadius:14,padding:14,border:"1px solid rgba(255,255,255,0.1)"}}>
          <p style={{color:"rgba(255,255,255,0.4)",fontSize:10,fontWeight:600,letterSpacing:"2px",textTransform:"uppercase",margin:"0 0 10px 0"}}>Template</p>
          <div style={{display:"flex",gap:8}}>
            {TEMPLATES.map(tpl=>(
              <button key={tpl.id} onClick={()=>setTemplateId(tpl.id)} style={{flex:1,padding:"9px 0",borderRadius:11,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,background:templateId===tpl.id?"#fff":"rgba(255,255,255,0.1)",color:templateId===tpl.id?"#111":"rgba(255,255,255,0.7)",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <span>{tpl.icon}</span>{tpl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div style={{background:"rgba(255,255,255,0.07)",borderRadius:14,padding:14,border:"1px solid rgba(255,255,255,0.1)"}}>
          <p style={{color:"rgba(255,255,255,0.4)",fontSize:10,fontWeight:600,letterSpacing:"2px",textTransform:"uppercase",margin:"0 0 10px 0"}}>Theme màu</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8}}>
            {THEMES.map(th=>(
              <button key={th.id} onClick={()=>setThemeId(th.id)} title={th.label} style={{height:40,borderRadius:10,border:themeId===th.id?"2.5px solid #fff":"2.5px solid transparent",background:`linear-gradient(135deg,${th.bg[0]},${th.bg[2]})`,cursor:"pointer",position:"relative",transition:"transform 0.15s",transform:themeId===th.id?"scale(1.1)":"scale(1)"}}>
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:th.accent}}/>
                </div>
                {themeId===th.id&&(
                  <div style={{position:"absolute",top:2,right:2,width:12,height:12,borderRadius:"50%",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Check style={{width:8,height:8,color:"#111"}}/>
                  </div>
                )}
              </button>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8,marginTop:6}}>
            {THEMES.map(th=>(
              <p key={th.id} style={{textAlign:"center",fontSize:9,margin:0,color:themeId===th.id?"#fff":"rgba(255,255,255,0.3)",fontWeight:themeId===th.id?600:400}}>{th.label}</p>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div style={{borderRadius:14,overflow:"hidden",boxShadow:"0 20px 56px rgba(0,0,0,0.6)"}}>
          <Preview assets={assetsWithRate} rates={exchangeRates} theme={theme} template={templateId} snap={snap}/>
        </div>

        {/* Export */}
        <button onClick={handleExport} disabled={exporting} style={{width:"100%",padding:15,borderRadius:14,border:"none",cursor:exporting?"not-allowed":"pointer",background:theme.accent,color:theme.btnDark?"#000":"#fff",fontWeight:700,fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",gap:10,opacity:exporting?.6:1}}>
          {exporting?<><Loader2 style={{width:18,height:18,animation:"spin 1s linear infinite"}}/>Đang xuất...</>
          :exported ?<><Check style={{width:18,height:18}}/>Đã lưu!</>
          :          <><Download style={{width:18,height:18}}/>Tải ảnh PNG</>}
        </button>

        <p style={{textAlign:"center",color:"rgba(255,255,255,0.25)",fontSize:11,margin:"0 0 8px 0"}}>
          Ảnh xuất 3× resolution · Không cần html2canvas · Pixel-perfect
        </p>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}