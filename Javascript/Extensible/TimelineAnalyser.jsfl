(function(ext){
	function TimelineAnalyser(options){

		var settings=new ext.Object({
			collectDistinctInstances:false,	// Collect a list of distinct scene instances, along with information of when and where the instance appears
			collectSymbolItems:false			// Collect a list of child symbol library items used, along with info of the frame ranges used
		});
		settings.extend(options);

		this.settings = settings;

		return this;
	}

	TimelineAnalyser.prototype={
		__proto__:Object,
		/**
		 * @property
		 * @see extensible.Object
		 */
		type:TimelineAnalyser,
		settings:null,
		callQueue:[],
		results:null,

		_currTimeline:0,
		_currLayer:0,
		_currFrame:0,
		_timelines:0,

		_currResults:0,

		begin:function(timelines){
			this._timelines = timelines;
			this.results = [];

			for(var i=0; i<timelines.length; ++i){
				var timeline = timelines[i];
				this.results[i] = {timeline:timeline, layerInstances:[], frameRanges:[{start:0, end:timeline.frameCount}]};
			}
			this._beginTimeline(0);
			this.callQueue.push(ext.closure(this, this._processFrame));
		},

		_processFrame:function(){
			var timeline = this._timelines[this._currTimeline];

			var layer = timeline.layers[this._currLayer];
			if(this._currFrame>=layer.frameCount){
				this._beginLayer(this._currLayer + 1);
			}
			if(this._currLayer>=timeline.layerCount){
				this._beginTimeline(this._currTimeline+1);
				timeline = this._timelines[this._currTimeline];
			}
			if(this._currTimeline>=this._timelines.length){
				this.callQueue.push(ext.closure(this, this._processSymbols));
				return;
			}
			layer = timeline.layers[this._currLayer];

			if(!this._currResults.frames)this._validateTimelineRanges(this._currResults);

			var frame = layer.frames[this._currFrame];
			if(frame.startFrame==this._currFrame){
				// Is Keyframe
				var elements = frame.elements;
				for(var i=0; i<elements.length; ++i){
					var elem = elements[i];
					if(elem.elementType=="instance"){
						if(elem.instanceType!="symbol"){
							fl.trace("Unsupported instance type '"+elem.instanceType+"' in frame "+timeline.name+" Layer:"+this._currLayer+" Frame:"+this._currFrame);
							continue;
						}

						var symbol = elem.libraryItem;
						var timelineRes;
						var timelineIndex = this._timelines.indexOf(symbol.timeline);
						if(timelineIndex==-1){
							this._timelines.push(symbol.timeline);
							timelineRes = {timeline:symbol.timeline, symbol:symbol, layerInstances:[], frameRanges:[]};
							this.results[this._timelines.length-1] = timelineRes;
						}else{
							timelineRes = this.results[timelineIndex];
						}

						// Is instance
						if(this.settings.collectDistinctInstances){
							var instRefs = this._currResults.layerInstances[symbol.name];
							if(!instRefs){
								instRefs = [];
								this._currResults.layerInstances[symbol.name] = instRefs;
							}
							var frameObj = {element:elem, start:this._currFrame, end:frame.duration + this._currFrame};
							var found = false;
							for(var j=0; j<instRefs.length; ++j){
								var instRef = instRefs[j];
								var works = true;
								for(var k=0; k<instRef.frameRanges.length; ++k){
									var frameObj2 = instRef.frameRanges[k];
									if(!(frameObj2.end<frameObj.start || frameObj.end<frameObj2.start)){
										works = false; // frame collision found, can't be considered the same object (i.e. same symbol exists on same frame & layer)
										break;
									}
								}
								if(works){
									instRef.frameRanges.push(frameObj);
									found = true;
								}
								if(found)break;
							}
							if(!found){
								instRefs.push({symbol:symbol, frames:[frameObj]});
							}
						}

						if(this.settings.collectSymbolItems){

							if(elem.symbolType=="graphic"){
								if(elem.loop=="single frame")timelineRes.frameRanges.push({start:elem.firstFrame, end:elem.firstFrame+1});
								else if(elem.loop=="play once")timelineRes.frameRanges.push({start:elem.firstFrame, end:Math.min(symbol.timeline.frameCount, elem.firstFrame + frame.duration)});
								else if(elem.loop=="loop"){
									var framesTaken = 0;
									var fromFrame = elem.firstFrame;
									while(framesTaken<frame.duration){
										var end = Math.min(symbol.timeline.frameCount, fromFrame + frame.duration);
										timelineRes.frameRanges.push({start:fromFrame, end:end});
										framesTaken += end - fromFrame;

										if(fromFrame==0)break;
										fromFrame = 0;
									}
								}
							}else{
								timelineRes.frameRanges.push({start:0, end:symbol.timeline.frameCount});
							}
							timelineRes.frames = null; // invalidate
						}
					}
				}
			}

			this._currFrame++;
			this.callQueue.push(ext.closure(this, this._processFrame));
		},

		_processSymbols : function(){
			for(var i in this.results){
				var timelineRes = this.results[i];
				if(timelineRes.frames)continue;

				this._validateTimelineRanges(timelineRes);
			}
		},

		_validateTimelineRanges : function(timelineRes){
			// combine frame runs
			for(var j=0; j<timelineRes.frameRanges.length; ++j){
				var run1 = timelineRes.frameRanges[j];
				var k=j+1;
				while(k<timelineRes.frameRanges.length){
					var run2 = timelineRes.frameRanges[k];

					if(!(run1.end<run2.start || run2.end<run1.start)){
						timelineRes.frameRanges.splice(k, 1);
						if(run1.start>run2.start)run1.start = run2.start;
						if(run1.end<run2.end)run1.end = run2.end;
					}else{
						++k;
					}
					break;
				}
			}
			// expand ranges into frame lookup
			timelineRes.frames = {};
			for(var j=0; j<timelineRes.frameRanges.length; ++j){
				var run = timelineRes.frameRanges[j];
				for(var k=run.start; k<run.end; ++k){
					timelineRes.frames[k] = true;
				}
			}
		},

		end:function(){
			results = {};
			this._currResults = null;
			this._timelines = null;
		},

		_beginTimeline:function(index){
			fl.trace("_beginTimeline: "+index);
			this._currTimeline = index;
			this._currResults = this.results[index];

			this._beginLayer(0);
		},

		_beginLayer:function(index){
			fl.trace("_beginLayer: "+index);
			this._currLayer = index;
			this._currFrame = 0;
			if(this._currResults)this._currResults.layerInstances[index] = {};
		}

	}
	ext.extend({TimelineAnalyser:TimelineAnalyser});
})(extensible)