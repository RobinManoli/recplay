define(["./levRender", "./recRender", "./objRender"], function(levRender, recRender, objRender){
	function signum(n){
		return n < 0? -1 : n > 0? 1 : 0;
	}

	function pad(n, s){
		s = String(s);
		while(s.length < n)
			s = "0" + s;
		return s;
	}

	return function(levRd, lgr, makeCanvas){
		var replays = [], levRn = levRender(levRd), levDraw = levRn.cached(2, makeCanvas);
		var lastFrame = 0;
		var refFrame = 0, refTime = Date.now();

		var focus = true; // whether focus is on replays[0]
		var offsX = 0, offsY = 0; // offset from start or replays[0]

		var startX = 0, startY = 0;
		void function(){
			function nvm(){}

			var l = levRd.objCount();
			for(var x = 0; x < l; x++)
				levRd.obj(x, nvm, nvm, nvm, function(x, y){
					startX = x;
					startY = y;
				});
		}();

		var scale100 = 100; // 100*scale, where 1 Elma unit length is 48 px
		var speed100 = 100; // 100*speed, where 1 is normal speed, -1 is reversed

		function calcFrameCount(){
			if(replays.length == 0)
				return 60*30; // animate objects for a minute
			return replays.map(function(rp){
				return rp.rd.frameCount();
			}).reduce(function(a, b){
				return Math.max(a, b);
			}, 0) + 30;
		}

		var frameCount = calcFrameCount();

		function cap(max){
			return Math.min(lastFrame, max);
		}

		return {
			draw: function(canv, x, y, w, h, onlyMaybe){
				var curFrame = refFrame + (Date.now() - refTime)*speed100*30/1000/100;
				if(replays.length > 0){
					if(curFrame >= frameCount){
						curFrame = refFrame = 0;
						refTime = Date.now();
					}else if(curFrame < 0){
						curFrame = refFrame = frameCount - 1;
						refTime = Date.now();
					}
				}

				if(onlyMaybe && lastFrame == curFrame)
					return;
				lastFrame = curFrame;

				x = Math.floor(x); y = Math.floor(y);
				w = Math.floor(w); h = Math.floor(h);
				canv.save();
				canv.translate(x, y);
				canv.beginPath();
				canv.moveTo(0, 0);
				canv.lineTo(w, 0);
				canv.lineTo(w, h);
				canv.lineTo(0, h);
				canv.clip();

				canv.clearRect(0, 0, w, h);

				var centreX = offsX, centreY = offsY;
				if(focus && replays.length > 0){
					var lf = cap(replays[0].rd.frameCount() - 1);
					centreX += replays[0].rn.bikeXi(lf);
					centreY -= replays[0].rn.bikeYi(lf);
				}else{
					centreX += startX;
					centreY += startY;
				}

				var escale = 48*scale100/100;
				var ex = centreX - w/escale/2, ey = centreY - h/escale/2;
				var ew = w/escale, eh = w/escale;

				levRn.drawSky(canv, lgr, ex, ey, ew, eh, escale);
				levDraw(canv, lgr, ex, ey, ew, eh, escale);
				if(focus && replays.length > 0)
					replays[0].objRn.draw(canv, lgr, cap(replays[0].rd.frameCount() - 1), ex, ey, escale);
				for(var z = replays.length - 1; z >= 0; z--)
					replays[z].rn.draw(canv, lgr, cap(replays[z].rd.frameCount() - 1), ex, ey, escale);
				if(focus && replays.length > 0){
					var t = Math.floor(cap(replays[0].rd.frameCount() - 1)*100/30);
					canv.font = "14px monospace";
					canv.fillStyle = "yellow";
					var csec = pad(2, t%100); t = Math.floor(t/100);
					var sec = pad(2, t%60); t = Math.floor(t/60);
					canv.fillText(t + ":" + sec + "." + csec, 10, 24);
				}

				canv.restore();
			},

			addReplay: function(recRd){
				replays.unshift({ rd: recRd, rn: recRender(recRd), objRn: objRender(levRd, recRd) });
				frameCount = calcFrameCount();
			},

			changeFocus: function(){
				replays.unshift(replays.pop());
			},

			setSpeed100: function(n){
				refFrame = lastFrame;
				refTime = Date.now();
				return speed100 = n;
			},

			getSpeed100: function(){ return speed100; },

			setScale100: function(n){
				return scale100 = n;
			},

			getScale100: function(){ return scale100; }
		};
	};
});
