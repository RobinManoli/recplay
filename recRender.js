define([], function(){
	function hypot(a, b){
		return Math.sqrt(a*a + b*b);
	}

	function skewimage(canv, img, bx, by, br, ih, x1, y1, x2, y2){
		var o = x2-x1, a = y2-y1;
		canv.save();
		canv.translate(x1, y1);
		canv.rotate(Math.atan2(a,o));
		canv.translate(-bx, -by*ih);
		canv.scale(bx + br + hypot(o, a), ih);
		img.draw(canv);
		canv.restore();
	}

	return function recRender(reader){
		var turnFrames = function(){
			var fc = reader.frameCount();
			var o = [], t = 0;
			for(var f = 0; f < fc; f++){
				var tmp = reader.turn(f) >> 1 & 1;
				if(tmp != t)
					o.push(f);
				t = tmp;
			}
			return o;
		}();

		var volts = function(){
			var ec = reader.eventCount();
			var o = [];
			for(var e = 0; e < ec; e++)
				reader.event(e, function(time, a, b){
					if(a & 255 == 255)
						switch(a >> 8){
							case 1791: // right volt
								o.push([Math.floor(time/.01455976568094950714), true]);
								break;
							case 2047: // left volt
								o.push([Math.floor(time/.01455976568094950714), false]);
								break;
						}
				});
				return o;
		}();

		function lastTurn(frame){
			for(var x = 0; x < turnFrames.length; x++)
				if(turnFrames[x] > frame)
					break;
			return x? turnFrames[x - 1] : -1;
		}

		function lastVolt(frame){
			for(var x = 0; x < volts.length; x++)
				if(volts[x][0] > frame)
					break;
			return x? volts[x - 1] : null;
		}

		console.log(turnFrames);
		console.log(volts);
		// (x, y): top left in Elma coordinates
		function draw(canv, lgr, frame, x, y, scale){
			canv.save();
			canv.scale(scale, scale);
			canv.translate(-x + reader.bikeX(frame), -y - reader.bikeY(frame));
			canv.beginPath();

			var bikeR = reader.bikeR(frame)*Math.PI*2/10000;
			var turn = reader.turn(frame) >> 1 & 1;
			var leftX = reader.leftX(frame)/1000;
			var leftY = reader.leftY(frame)/1000;
			var leftR = reader.leftR(frame)*Math.PI*2/250;
			var rightX = reader.rightX(frame)/1000;
			var rightY = reader.rightY(frame)/1000;
			var rightR = reader.rightR(frame)*Math.PI*2/250;
			var headX = reader.headX(frame)/1000;
			var headY = reader.headY(frame)/1000;
			var lastTurnF = lastTurn(frame);

			canv.save(); // left wheel
				canv.translate(leftX, -leftY);
				canv.rotate(-leftR);
				canv.scale(38.4/48, 38.4/48);
				canv.translate(-0.5, -0.5);
				lgr.wheel.draw(canv);
			canv.restore();

			canv.save(); // right wheel
				canv.translate(rightX, -rightY);
				canv.rotate(-rightR);
				canv.scale(38.4/48, 38.4/48);
				canv.translate(-0.5, -0.5);
				lgr.wheel.draw(canv);
			canv.restore();

			canv.save();
				canv.rotate(-bikeR);
				if(turn)
					canv.scale(-1, 1);
				if(lastTurnF >= 0 && lastTurnF + 15 > frame) // TODO: it's not linear
					canv.scale(((frame - lastTurnF)/15 - 0.5)*2, 1);

				var wx, wy, a, r;
				canv.save();
					canv.scale(1/48, 1/48);

					// front suspension
					wx = turn? rightX : leftX;
					wy = turn? -rightY : -leftY;
					a = Math.atan2(wy, (turn? -1 : 1) * wx) + (turn? -1 : 1) * bikeR;
					r = hypot(wx, wy);
					skewimage(canv, lgr.susp1, 5, 0.5, 5, 6.5, -20, -17, 48*r * Math.cos(a), 48*r * Math.sin(a));

					// rear suspension
					wx = turn? leftX : rightX;
					wy = turn? -leftY : -rightY;
					a = Math.atan2(wy, (turn? -1 : 1) * wx) + (turn? -1 : 1) * bikeR;
					r = hypot(wx, wy);
					skewimage(canv, lgr.susp2, 5, 0.5, 5, 6.5, 48*r*Math.cos(a), 48*r*Math.sin(a), 10, 20);
				canv.restore();

				canv.save();
					canv.translate(-42/48, -10/48);
					canv.rotate(-Math.atan(3/4));
					canv.scale(10/47, 10/47);
					canv.scale(380/48, 301/48);
					lgr.bike.draw(canv);
				canv.restore();

				canv.save(); // kuski
					r = hypot(headX, headY);
					a = Math.atan2(-headY, turn? -headX : headX) + (turn? -bikeR : bikeR);
					wx = r*Math.cos(a);
					wy = r*Math.sin(a);
					canv.translate(wx, wy);

					canv.save(); // head
						canv.translate(-17/48, -42/48);
						canv.scale(23/48, 23/48);
						lgr.head.draw(canv);
					canv.restore();

					var bumx = 20/48, bumy = 0;
					var pedalx = -wx + 4/48, pedaly = -wy + 23/48;
					var bum2pedal = hypot(pedalx - bumx, pedaly - bumy);
					var upper = 25/48; // length of
					var lower = 25/48; // ..

					var prod =
						(bum2pedal + upper + lower)*
						(bum2pedal - upper + lower)*
						(bum2pedal + upper - lower)*
						(-bum2pedal + upper + lower);
					var b2pangle = Math.atan2(pedaly - bumy, pedalx - bumx);
					var jointangle = 0;
					if(prod >= 0){
						// law of sines
						var circumr = bum2pedal*upper*lower/Math.sqrt(prod);
						jointangle = Math.asin(lower/(2*circumr));
					}else
						upper = upper/(upper + lower)*bum2pedal;
						
					var jointx = bumx + upper*Math.cos(b2pangle + jointangle);
					var jointy = bumy + upper*Math.sin(b2pangle + jointangle);

					// leg—a bit repetitive
					skewimage(canv, lgr.q1thigh, 2/48, 0.5, 6/48, 0.25, jointx, jointy, bumx, bumy);
					skewimage(canv, lgr.q1leg, 0, 0.5, 3/48, 0.4, pedalx, pedaly, jointx, jointy);

					canv.save(); // torso
						canv.translate(15/48, 10/48);
						canv.rotate(Math.PI + Math.PI/5);
						canv.scale(32/48, 21/48);
						lgr.q1body.draw(canv);
					canv.restore();

					var shoulderx = -1/48, shouldery = -15/48;
					var handx = -wx - 20/48, handy = -wy - 17/48;

					var lower = 17/48, upper = 17/48;
					var shoulder2hand = hypot(handx - shoulderx, handy - shouldery);

					var lv = lastVolt(frame);
					if(lv != null && frame - lv[0] < 25){
						// anim: 20/100 s to move hand to new position, 75/100 s to move back
						var animpos = frame - lv[0];
						animpos = animpos <= 6? animpos/6 : 1 - (animpos - 6)/(25 - 6);
						// elma actually uses the current frame here, which seems weird
						if(lv[1] != Boolean(reader.turn(lv[0]) >> 1 & 1))
							animpos *= -1;
						var at = Math.atan2(handy - shouldery, handx - shoulderx) + animpos*2*Math.PI/3;
						handx = shoulderx + shoulder2hand*Math.cos(at);
						handy = shouldery + shoulder2hand*Math.sin(at);
					}

					var prod =
						(shoulder2hand + upper + lower)*
						(shoulder2hand - upper + lower)*
						(shoulder2hand + upper - lower)*
						(-shoulder2hand + upper + lower);
					var jointangle = 0;
					if(prod >= 0){
						var circumr = shoulder2hand*upper*lower/Math.sqrt(prod);
						jointangle = Math.asin(lower/(2*circumr));
					}else
						upper = upper/(upper + lower)*shoulder2hand;

					var s2hangle = Math.atan2(handy - shouldery, handx - shoulderx);
					var jointx = shoulderx + upper*Math.cos(s2hangle - jointangle);
					var jointy = shouldery + upper*Math.sin(s2hangle - jointangle);

					// arm
					skewimage(canv, lgr.q1up_arm, 2/48, 0.5, 15/180, -10/48, jointx, jointy, shoulderx, shouldery);
					skewimage(canv, lgr.q1forarm, 2/48, 0.75, 3/48, 8/48, handx, handy, jointx, jointy);
				canv.restore();
			canv.restore();
			canv.restore();
		}

		return {
			draw: draw
		};
	};
});