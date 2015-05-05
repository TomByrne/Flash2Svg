(function(ext){

	function SVG(options){
		fl.outputPanel.clear();

		this.VIEW_BOX_PADDING=50; // Adds gap around viewBox to avoid clipping.

		this.DEFAULT_GRADIENT_LENGTH=819.2; // Pre-transformation length of ALL linear gradients in flash.
		this.DEFAULT_GRADIENT_RADIUS=810.7; // Pre-transformation radius of ALL radial gradients in flash.
		this.DEFAULT_BITMAP_SCALE=1/20;
		this.MAX_INLINE_CALL_COUNT=2999; // Max recursions
		this.IDENTITY_MATRIX='matrix(1 0 0 1 0 0)';
		this.NO_TWEEN_SPLINE_TOKEN='DISC';
		this.NO_TWEEN_SPLINE='.1 .1 .9 .9';
		this.LINEAR_SPLINE='0 0 1 1';
		this.DOCUMENT_DATA='SVGExportOptions';
		this.MODULO_STAND_IN='.__';

		// Processing states
		this.STATE_PRE_INIT = 0;
		this.STATE_TIMELINES = 1;
		this.STATE_DELETE_EXISTING_FILES = 2;
		this.STATE_REUSING_SYMBOLS = 3;
		this.STATE_EXPANDING_USE_NODES = 4;
		this.STATE_REUSING_FRAMES = 5;
		this.STATE_SIMPLIFYING_FRAMES = 6;
		this.STATE_FINALISING_FILES = 7;
		this.STATE_CLEANUP = 8;
		this.STATE_DONE = 9;

		var settings=new ext.Object({
			file:undefined,
			decimalPointPrecision:3,
			expandSymbols:'usedOnce', // 'nested', 'all', 'none', 'usedOnce'
			rendering:'auto', // 'auto', 'optimizeSpeed', 'optimizeQuality', 'inherit'
			rootScaling:"none", // 'none', 'contain', 'crop'
			tweenType:null, // 'highKeyframe', 'highAllFrames', 'low'
			convertPatternsToSymbols:true,
			applyTransformations:true,
			applyColorEffects:true,
			flattenMotion:true,
			curveDegree:3,
			maskingType:'clipping', // 'clipping', 'alpha', 'luminance'
			frames:'all', // 'custom', 'all', 'current'
			startFrame:undefined, // only relevant when frames=='custom'
			endFrame:undefined, // only relevant when frames=='custom'
			animated:false,
			timelines:new ext.Array([]),
			backgroundColor:ext.doc.backgroundColor,
			includeBackground:false,
			includeHiddenLayers:true,
			convertTextToOutlines:true,
			includeGuides:false,
			selection:null,
			swfPanelName:null,
			id:String(ext.doc.name.stripExtension().camelCase()),
			x:0,y:0,
			width:ext.doc.width,
			height:ext.doc.height,
			docString:'<?xml version="1.0" encoding="utf-8"?>\n',
			version:'1.1',
			baseProfile:'basic',
			log:null, // debugging log
			traceLog:false,
			source:'current',// 'current', 'libraryItems'
			output: 'animation',// 'animation', 'images'
			clipToScalingGrid:false, // only relevant when source=='Selected Library Items'
			clipToBoundingBox:false, // only relevant when source=='Selected Library Items'
			beginAnimation:"0s",
			repeatCount:"indefinite",
			loop:null,
			nonAnimatingShow:"end",
			loopTweens:true,
			discreteEasing:true,
			removeGroups:true,
			compactOutput:true,
			avoidMiter:true,
			animatedViewBox:false
		});
		if(options instanceof XML || typeof(options)=='string'){
			ext.Task.apply(this,[settings]);
			this.loadSettings(options);
		}else{
			if(options.version && options.props){
				options = options.props;
			}
			settings.extend(options);
			ext.Task.apply(this,[settings]);
		}
		var fileUri;
		var fileDir;
		if(ext.doc.pathURI){
			if(ext.doc.pathURI.toLowerCase().indexOf(".xfl")==ext.doc.pathURI.length - 4){
				fileUri = ext.doc.pathURI.dir;
				fileDir = fileUri.dir;
			}else{
				fileUri = ext.doc.pathURI.stripExtension();
				fileDir = ext.doc.pathURI.dir;
			}
		}
		if(!this.log){
			if(ext.doc.pathURI){
				this.log = fileUri+'.log.csv';
			}else{
				this.log = fl.configURI+'SvgAnimation.log.csv';
			}
		}
		if(this.loop===true){
			this.repeatCount = "indefinite";
		}else if(this.loop===false){
			this.repeatCount = "1";
		}
		if(!options && ext.doc.documentHasData(this.DOCUMENT_DATA)
		){
			this.settingsXML=this.loadSettings(ext.doc.getDataFromDocument(this.DOCUMENT_DATA));
		}

		var isWindows = (fl.version.indexOf("WIN")!=-1);
		if((isWindows && this.file.charAt(1)==":") || (!isWindows && this.file.charAt(0)=="/")){
			this.file = FLfile.platformPathToURI(this.file);
		}
		if(this.file && !/^file\:/.test(this.file)){
			if(!ext.doc.pathURI){
				alert("Can't use relative export path with unsaved document.\nPlease save the document or use an absolute path");
				return;
			}else{
				this.file = this.file.absoluteURI(fileDir);		
			}	
		}
		var extIndex = this.file.indexOf(".svg");
		if(extIndex==this.file.length - 4){
			this.file = this.file.substr(0, this.file.length - 4);
		}
		
		if(this.tweenType){
			switch(this.tweenType){
				case "highKeyframe":
					this.discreteEasing = false;
					this.flattenMotion = false;
					break;
				case "highAllFrames":
					this.discreteEasing = false;
					this.flattenMotion = true;
					break;
				case "low":
					this.discreteEasing = true;
					this.flattenMotion = true;
					break;
			}
		}

		var timeline;
		if(this.frames=='current'){
			this.frames=new ext.Array([]);
			if(this.source=='current'){
				this.startFrame=ext.frame;
				this.endFrame=ext.frame+1;
			}else{
				this.startFrame=0;
				this.endFrame=1;
			}
		}else if(this.frames=='all'){
			this.startFrame=0;

			if(this.source=='current'){
				this.endFrame = ext.timeline.$.frameCount;
			}else if(this.source=='libraryItems'){
				this.endFrame=0;
				for(var i=0;i<selectedItems.length;i++){
					timeline=selectedItems[i].timeline;
					if(timeline.$.frameCount-1>this.endFrame){
						this.endFrame = timeline.$.frameCount;
					}
				}
			}
		}else if(this.frames=='custom'){
			this.startFrame--; // So that 1>1 actually equates to 0>1
		}

		if(this.repeatCount===true)this.repeatCount = "indefinite";
		else if(this.repeatCount===false)this.repeatCount = "1";

		this._showMiterWarning = false;

		if(this.nonAnimatingShow=="start"){
			this.showStartFrame = true;
		}else if(this.nonAnimatingShow=="end"){
			this.showEndFrame = true;
		}

		if(this.output=='animation'){
			this.animated = true;
		}
		if(this.animated)this.applyTransformations = false;
		
		if(typeof(this.curveDegree)=='string'){
			var num = parseInt(this.curveDegree);
			if(num.toString() == this.curveDegree){
				this.curveDegree = num;
			}else{
				this.curveDegree=['','','Quadratic','Cubic'].indexOf(this.curveDegree);
			}
		}
		this.swfPanel=ext.swfPanel(this.swfPanelName); // the swfPanel
		this._timer=undefined;
		//this._symbolToUseNodes={};
		//this._rootItem={};
		this._tempFolder=ext.lib.uniqueName('temp'); // Library folder holding temporary symbols.
		this._origSelection=new ext.Selection([]);
		this._delayedProcessing=true;// If true, a timeline is processed one level deep in it's entirety before progressing to descendants.
		this.currentState=0;
		this._layerCacheLists = [];
		this._symbolLists = [];
		this._useNodeMaps = [];

		this._origTimeline = ext.doc.getTimeline();

		var versionParser = /\w* (\d+),.*/g;
		var result = versionParser.exec(fl.version);
		if(result){
			this._appVersion = parseInt(result[1]);
		}

		if(this.startFrame!=undefined){
			if(this.endFrame==undefined || this.endFrame<this.startFrame){
				this.endFrame=this.startFrame;
			}
			this.frames = [];
			for(var i=this.startFrame; i<this.endFrame; i++){
				this.frames.push(i);
			}
		}
		if(!this.frames.length){
			this.frames.push(ext.frame);
		}
		if(this.source=='current'){
			timeline={
				timeline:ext.timeline,
				timelineRef: (ext.timeline.libraryItem ? ext.timeline.libraryItem.name : ext.doc.currentTimeline),
				matrix:ext.viewMatrix,
				frames:this.frames,
				width:ext.doc.width,
				height:ext.doc.height,
				libraryItem:ext.timeline.libraryItem,
				filePath:this.file+".svg"
			};
			this.timelines.push(timeline);
		}else if(this.source=='libraryItems'){
			this.timelines.clear();
			var selectedItems=ext.lib.getSelectedItems();
			var width,height;
			for(var i=0;i<selectedItems.length;i++){
				if(selectedItems[i] instanceof ext.SymbolItem){
					timeline=selectedItems[i].timeline;
					if(timeline){
						var timeline={
							timeline:timeline,
							matrix:new ext.Matrix(),
							frames:this.frames,
							libraryItem:selectedItems[i]
						};
						if(selectedItems.length>1){
							timeline.filePath = this.file+"/"+timeline.name+".svg";
						}else{
							timeline.filePath = this.file+".svg";
						}
						if(
							this.clipToScalingGrid &&
							selectedItems[i].scalingGrid
						){
							var rect=selectedItems[i].scalingGridRect;
							timeline.width=rect.right-rect.left;
							timeline.height=rect.bottom-rect.top;
							timeline.matrix.tx=-rect.left;
							timeline.matrix.ty=-rect.top;
						}else{
							timeline.width=ext.doc.width;
							timeline.height=ext.doc.height;
						}
						this.timelines.push(timeline);
					}
				}
			}
		}
		if(!this.animated && this.frames.length){
			var splitTimelines = [];
			for(var i=0;i<this.timelines.length;i++){
				var timeline = this.timelines[i];
				for(var j=0;j<this.frames.length;j++){
					var timelineClone = {
						timeline:timeline.timeline,
						matrix:timeline.matrix,
						frames:[this.frames[j]],
						libraryItem:timeline.libraryItem,
						width:timeline.width,
						height:timeline.height
					}
					if(this.timelines.length>1){
						timelineClone.filePath = this.file+"/"+timeline.timeline.name+"_"+this.frames[j]+".svg";
					}else{
						timelineClone.filePath = this.file+"/"+this.frames[j]+".svg";
					}
					splitTimelines.push(timelineClone);
				}
			}
			this.timelines = splitTimelines;
		}


		this._originalEditList = [];
		this._originalFramesList = [];
		var currentTimeline = ext.doc.getTimeline();
		while(currentTimeline.libraryItem){
			ext.doc.exitEditMode();
			if(ext.doc.selection.length==0){
				this._originalEditList.unshift(currentTimeline.libraryItem);
				this._originalFramesList.unshift(0);
				currentTimeline = null;
				break;
			}else if(ext.doc.selection.length!=1 || (ext.doc.selection[0].libraryItem!=currentTimeline.libraryItem)){
				alert("Couldn't discover edit path: "+ext.doc.selection.length); // just a precaution at the moment
				return;
			}
			var element = ext.doc.selection[0];
			element.frame = currentTimeline.currentFrame;
			this._originalEditList.unshift(element);
			this._originalFramesList.unshift(currentTimeline.currentFrame);
			currentTimeline = ext.doc.getTimeline();
		}
		if(currentTimeline){
			this._originalEditList.unshift(ext.doc.timelines.indexOf(currentTimeline));
			this._originalFramesList.unshift(currentTimeline.currentFrame);
		}

		return this;
	}
	SVG.prototype={
		__proto__:Object,
		/**
		 * @property
		 * @see extensible.Object
		 */
		type:SVG,




		/**
		 * Begins processing. 
		 * 
		 */
		begin:function(){
			if(this.log && typeof(this.log)=='string'){
				ext.startLog({url:this.log});
				this._timer=ext.log.startTimer('extensible.SVG()');
			}
			this.qData = [];
			this.doState();
		},
		/**
		 * This method processes data incrementally, providing the
		 * opportunity for the swfPanel and/or que to update progress or interupt processing if necessary.		 * 
		 * 
		 */
		process:function(){
			if(this.qData.length>0){
				var endTime = (new Date()).getTime()+(1000/30);
				while(
					this.qData.length && ( new Date()).getTime()<endTime ){
					var nextCall = this.qData.shift();
					nextCall();
					
					if(!this.swfPanel){ break; }				
				}
			}else{
				try{
					if(this.currentState==this.STATE_TIMELINES && ++this._timelineIndex<this.timelines.length){
						this.qData.push(closure(this.doNextTimeline, [], this));
					}else{
						return this.nextState();
					}
				}catch(e){
					ext.message(e);
				}
			}
			return true;
		},
		/**
		 * Moves process to next state processing.
		 */
		nextState:function(){
			this.currentState++;
			return this.doState();
		},
		end:function(){
			this.currentState = this.STATE_DONE;
			this.qData = [];
		},
		doState:function(){
			switch(this.currentState){
				case this.STATE_PRE_INIT:
					this.qData.push(closure(this.doInit, [], this));
					break;
				case this.STATE_TIMELINES:
					this.qData.push(closure(this.doNextTimeline, [], this));
					break;
				case this.STATE_DELETE_EXISTING_FILES:
					this.qData.push(closure(this.deleteExistingFiles, [], this));
					break;
				case this.STATE_REUSING_SYMBOLS:
					this.qData.push(closure(this.doReuseSymbols, [0, 0], this));
					break;
				case this.STATE_EXPANDING_USE_NODES:
					this.qData.push(closure(this.processExpandUseNodes, [], this));
					break;
				case this.STATE_REUSING_FRAMES:
					this.qData.push(closure(this.doReuseFrames, [0, 0], this));
					break;
				case this.STATE_SIMPLIFYING_FRAMES:
					this.qData.push(closure(this.processSimplifyFrames, [], this));
					break;
				case this.STATE_FINALISING_FILES:
					this.qData.push(closure(this.processFinaliseDocuments, [], this));
					break;
				case this.STATE_CLEANUP:
					this.qData.push(closure(this.processCleanup, [], this));
					break;
				default:
					// done all
					return false;
			}

			return true;
		},
		doInit:function(){
			fl.showIdleMessage(false);
			if(this.log){
				var timer=ext.log.startTimer('extensible.SVG.doInit()');
			}
			this._origSelection=ext.sel;
			ext.doc.selectNone(); // selection slows performance & can cause crashes
			this.doms = [];
			if(ext.log){
				ext.log.pauseTimer(timer);	
			}
			this._timelineIndex = 0;
			this.nextState();
		},
		doNextTimeline:function(){
			fl.showIdleMessage(false);
			if(this.log){
				var timer=ext.log.startTimer('extensible.SVG.doNextTimeline()');
			}

			/*
			 * cleanup temporary items
			 */
			if(ext.lib.itemExists(this._tempFolder)){
				ext.lib.deleteItem(this._tempFolder);	
			}
			this._ids={}; // Used by uniqueID() for cross-checking IDs.
			this._timelineCopies = {};
			this._symbols={};
			this._symbolBounds={};
			this._fillMap={};
			this._maskFilter = null;
			this._symbolList = [];
			this._bitmaps={};
			this._sounds={};
			this._soundIds={};
			this._symbolLists.push(this._symbolList);

			this._soundNode=null;
			this._useNodeMap = {};
			this._useNodeMaps.push(this._useNodeMap);

			var timelineIndex = this._timelineIndex;


			var timeline = this.timelines[timelineIndex];
			fl.trace("\ndoNextTimeline: "+timelineIndex+" "+timeline.filePath);

			var xml=new XML('<svg xmlns:xlink="http://www.w3.org/1999/xlink"/>');
			xml['@id']=this.id;
			xml['@image-rendering']=this.rendering;
			xml['@baseProfile']=this.baseProfile;
			xml['@version']=this.version;
			if(this.includeBackground){
				xml['@style']="background-color:"+this.backgroundColor;
			}
			if(this.rootScaling=="contain"){
				xml['@preserveAspectRatio'] = "xMidYMid meet";
			}else if(this.rootScaling=="crop"){
				xml['@preserveAspectRatio'] = "xMidYMid slice";
			}
			xml['@x']=String(this.x)+'px';
			xml['@y']=String(this.y)+'px';
			xml['@width']=String(this.width)+'px';
			xml['@height']=String(this.height)+'px';
			xml['@xml:space']='preserve';
			xml.appendChild(new XML('<defs/>'));

			var x=this._getTimeline(
				timeline.timeline,
				{
					dom:xml,
					matrix:timeline.matrix,
					startFrame:timeline.frames[0],
					endFrame:timeline.frames[0]+timeline.frames.length,
					timelineRef:timeline.timelineRef,
					//selection:this.selection,
					libraryItem:timeline.libraryItem,
					isRoot:true,
					flattenMotion:this.flattenMotion,
					beginAnimation:this.beginAnimation,
					beginOffset:0,
					repeatCount:this.repeatCount,
					loopTweens:this.loopTweens,
					discreteEasing:this.discreteEasing
				}
			);
			this._explodeNode(x, xml);
			this.doms[timelineIndex] = xml;

			if(ext.log){
				ext.log.pauseTimer(timer);	
			}
		},
		_explodeNode:function(node, intoNode){
			var atts = node.attributes();
			for(var i=0; i<atts.length(); i++){
				var att = atts[i];
				intoNode.@[att.name()] = att.toXMLString();
			}
			var children = node.children();
			for(var i=children.length()-1; i>=0; i--){
				var child = children[i];
				intoNode.prependChild(child);
			}
		},
		/*
		 * If the target is a file and needs to be a folder, delete it first,
		 * and vice-versa.
		 */
		deleteExistingFiles:function(){
			var folderRequired = (this.timelines.length > 1 || (this.frames.length>1 && !this.animated));
			var path = (folderRequired?this.file:this.file+".svg");
			var exists = FLfile.exists(path);

			if(exists){
				var isFolder = (FLfile.getAttributes(path).indexOf("D")!=-1);
				if(folderRequired != isFolder){
					FLfile.remove(path);
					exists=false;
				}
			}
			if(folderRequired && !exists){
				if(!FLfile.createFolder(path))
					throw new Error('Problem creating folder.');
			}
		},
		processExpandUseNodes:function(){
			if(this.expandSymbols=="none")return;

			var onceUsed = this.expandSymbols=='usedOnce';
			var nested = this.expandSymbols=='nested';
			for(var i=0; i<this.doms.length; ++i){
				var dom = this.doms[i];
				this.qData.push(closure(this.checkExpand, [dom, dom.defs, dom, onceUsed, nested], this));
			}
		},
		isDescendant:function(parent, child){
			while(child.parent()){
				if(child.parent()==parent){
					return true;
				}
				child = child.parent();
			}
			return false;
		},
		checkExpand:function(element, defs, root, onceUsed, nested){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG.checkExpand()');	
			}
			//fl.trace("checkExpand:"+element.localName()+" "+element.@id+" "+element.childIndex());
			var id;
			if(element.localName()=="use" && (id = element['@xlink-href'].toString())){
				var allUseNodes = root..use;
				var useList = [];
				for(var i=0; i<allUseNodes.length(); i++){
					var node = allUseNodes[i];
					if(node['@xlink-href']==id){
						useList.push(node);
					}
				}

				var symbol=defs.symbol.("#"+@id.toString()==id);
				if(symbol && symbol.length() && (!nested || (symbol[0]..use && symbol[0]..use.length()))
					&& (!onceUsed || useList.length==1)){

					//fl.trace("executeExpandUse: "+id+" "+useList.length+" "+onceUsed);
					this.executeExpandUse(id, symbol, useList, defs);

					if(isNaN(element.childIndex())){
						// symbol was swapped in for use node
						element = symbol;
						//fl.trace("switch: "+element.localName());
					}
					//fl.trace("Ex: "+id+" "+element.childIndex());
				}

			}

			var children = element.children();
			if(children.length()){
				// goto first child
				//fl.trace("\tChild: "+element.localName()+" "+children[0].localName()+" "+children[0].@id);
				this.qData.unshift(closure(this.checkExpand, [children[0], defs, root, onceUsed, nested], this));
				return;
			}

			if(!element.parent() || !element.parent().length())return; // empty root?
			
			var siblings = element.parent().children();
			var index = element.childIndex();
			//fl.trace("> "+element.parent().localName()+" "+element.localName()+" "+index);
			while(index==siblings.length()-1){
				element = element.parent();
				if(!element.parent() || !element.parent().length() || element==root)return; // finished

				siblings = element.parent().children();
				index = element.childIndex();
				//fl.trace("\t\tUp:"+element.@id+" "+element.parent().@id+" "+index+" "+siblings.length()+" "+(index==siblings.length()-1));
			}
			// goto next sibling (of self or first ancestor with a next sibling)
			//fl.trace("\tNext:"+element.localName()+" "+element.@id+" "+siblings[index+1].localName()+" "+siblings[index+1].@id+" "+index+" "+siblings[index+1].childIndex());
			this.qData.unshift(closure(this.checkExpand, [siblings[index+1], defs, root, onceUsed, nested], this));
			if(ext.log){
				ext.log.pauseTimer(timer);
			}
		},
		processSimplifyFrames:function(){
			if(!this.removeGroups)return;

			this._doneSimplified = [];
			for(var i=0; i<this.doms.length; ++i){
				var dom = this.doms[i];
				this.qData.push(closure(this.simplifyFrame, [dom], this));
			}
		},
		simplifyFrame:function(frameNode, verbose){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG.simplifyFrame()');	
			}
			var copy = frameNode.toXMLString();

			var length = frameNode.children().length();
			var frameName = frameNode.localName();
			if(frameName!="mask" && frameName!="g" && frameName!="symbol"){
				for(var i=0; i<length; ++i){
					this.qData.unshift(closure(this.simplifyFrame, [frameNode.children()[i]], this));
				}
				return;
			}

			var searchChildren = [];
			var i=0;
			if(verbose)fl.trace("\n\nBEFORE:\n"+frameNode.toXMLString());
			var toDelete = [];
			var graphChildren = frameNode.g.length() + frameNode.path.length() + frameNode.use.length();
			var canExplode = frameName=="g";
			while( i<length ){
				var childNode = frameNode.children()[i];
				var name = childNode.localName();
				if(verbose)fl.trace(">> "+i+"/"+length+" "+name+" "+childNode.animate.length()+" "+childNode.animateTransform.length()+" "+childNode.@transform.length());
				if(name=="g"){
					var animTransNodes = childNode.animateTransform.length();
					var animNodes = animTransNodes + childNode.animate.length();
					var hasStyle = childNode.@style.length()>0;
					if((animTransNodes && childNode.@transform.length() && (graphChildren > 1 || !canExplode)) ||
						(animNodes && graphChildren > 1) ||
						(hasStyle && graphChildren > 1) || // If has style attribute and other graphic siblings, cannot change
						childNode.@mask.length()>0 ){
						/*
							Sometimes a group can't be expanded because it serves as an animation
							container, or a mask container.
						*/
						searchChildren.push(childNode);
						++i;
						continue;
					}
					if(verbose)fl.trace("\n\nBEF:\n"+frameNode.toXMLString());

					doSearchSelf = true;
					var hasTrans = childNode.@transform.length()>0;
					var parentTakenTrans = false;
					var grandchild = childNode.children().length();
					if(hasTrans){
						var trans = childNode.@transform.toString();
						var transMat = new ext.Matrix(trans);

						/*
							Count how many graphic children don't have transforms so we know whether breaking the
							group apart will actually increase file size.
						*/
						var noTransCount = 0;
						var maskCount = 0;
						var sameTrans = true;
						var childTrans = null;
						for(var k=0; k<grandchild; k++){
							var newChild = childNode.children()[k];
							if(newChild.@mask.length()==0){
								maskCount++;
							}
							if(newChild.@transform.length()==0){
								noTransCount++;
								sameTrans = false;
							}else if(sameTrans){
								if(!childTrans){
									childTrans = newChild.@transform.toString();
								}else if(newChild.@transform.toString()!=childTrans){
									sameTrans = false;
								}
							}
						}
						if(grandchild>1 && sameTrans && !animTransNodes && !childNode.@mask.length()){
							/*
								Here we can check if all children have the same transform and, if so,
								move it to the parent (and skip expansion by setting noTransCount).
							*/
							this._applyMatrix(childNode, childTrans, new ext.Matrix(childTrans), true);
							noTransCount = grandchild;
							for(var k=0; k<grandchild; k++){
								var newChild = childNode.children()[k];
								delete newChild.@transform;
							}
							//fl.trace("SAME TRANS: "+childTrans+"\n"+frameNode.toXMLString());
							parentTakenTrans = true;
						}
						if(noTransCount > 2 || maskCount>0){
							/*
								If a group has many children without transforms, it's not worth expanding.
							*/
							searchChildren.push(childNode);
							++i;
							//fl.trace("TOO MANY EMPTY: "+noTransCount);
							continue;
						}

						if(graphChildren==1 && canExplode && noTransCount && !parentTakenTrans){
							/*
								if there are no siblings which would be negatively effected, we just move the transform to the parent
								instead of cluttering the children with transforms (unless all of the children already have transforms)
							*/
							this._applyMatrix(frameNode, trans, transMat, true);
							parentTakenTrans = true;
						}
					}
					if(hasStyle){
						frameNode.@style = childNode.@style;
					}
					var lastChild = childNode;
					var lastIndex = i;
					for(var k=0; k<grandchild; k++){
						var newChild = childNode.children()[k];
						frameNode.insertChildAfter(lastChild, newChild);
						newChild = frameNode.children()[lastIndex + 1];
						if(hasTrans && !parentTakenTrans){
							this._applyMatrix(newChild, trans, transMat, false);
							/*if(!newChild.@transform.length()){
								newChild.@transform = trans;
							}else{
								var childTrans = new ext.Matrix(newChild.@transform.toString());
								var mat = childTrans.concat(transMat);
								fl.trace("\nC MERGE: "+k+"/"+childNode.children().length()+"\n"+newChild.@transform.toString()+" + "+trans+" = "+this._getMatrix(mat));
								newChild.@transform = this._getMatrix(mat);
							}*/
						}
						var newChildName = newChild.localName();
						var isGraphic = (newChildName=="g" || newChildName=="path" || newChildName=="use");
						for(var j=0; j<childNode.attributes().length(); j++){
							var attr = childNode.attributes()[j];
							var name = attr.name();
							if(name=="id"){
								if(frameNode.@id.length()==0)frameNode.@id = attr.toXMLString();
								continue;
							}
							if(	(!hasTrans || name!="transform") &&
								(!hasStyle || name!="style") &&
								(!isGraphic || name!="viewBox") &&
								(!isGraphic || name!="overflow"))
									newChild.@[attr.name()] = attr.toXMLString();
						}
						lastChild = newChild;
						lastIndex++;
						//if(verbose)fl.trace("ADD: "+i+"/"+frameNode.children().length()+" "+lastIndex);
					}

					var lengthWas = frameNode.children().length();
					delete frameNode.children()[i];
					if(frameNode.children().length() == lengthWas){
						toDelete.push(i);
						i++
					}
					if(verbose)fl.trace("\nAFT: "+hasTrans+" "+trans+" "+frameNode.children().length()+" "+length+"\n"+frameNode.toXMLString());


					length = frameNode.children().length();
					graphChildren = frameNode.g.length() + frameNode.path.length() + frameNode.use.length();
					continue;

				}
				++i;
			}
			if(verbose)fl.trace("DELETE: "+frameNode.children().length()+" "+toDelete.length);
			for(var i=0; i<toDelete.length; i++){
				delete frameNode.children()[toDelete[i]];
			}
			if(verbose)fl.trace("\nAFTER: "+frameNode.children().length()+" "+length+"\n"+frameNode.toXMLString());
			for(var i=0; i<searchChildren.length; ++i){
				this.qData.unshift(closure(this.simplifyFrame, [searchChildren[i]], this));
			}
			if(ext.log){
				ext.log.pauseTimer(timer);
			}
		},
		processFinaliseDocuments:function(){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG.processFinaliseDocuments()');	
			}
			for(var k=0; k<this.timelines.length;k++){
				var timeline = this.timelines[k];
				var document = this.doms[k];

				if(this.applyTransformations){
					this.applyMatrices(document);
				}
				if(this.applyColorEffects){
					this._applyColorEffects(document, document.defs);
				}
				this._deleteUnusedFilters(document);
				document['@xmlns']="http://www.w3.org/2000/svg";

				var trans = document.@transform;
				if(trans.length()){
					// transform doesn't work on the root node, so transfer it to it's children
					var transMat = new ext.Matrix(trans.toString());
					var children = document.children().length();
					for(var i=0; i<children; i++){
						var child = document.children()[i];
						var childName = child.localName();
						if(childName=="g" || childName=="path" || childName=="path"){
							this._applyMatrix(child, trans, transMat, false);
						}
					}
					delete document.@transform;
				}
				if(document.@preserveAspectRatio.length()){
					document['@viewBox']=String(this.x)+' '+String(this.y)+' '+String(this.width)+' '+String(this.height);
				}
				document.@width = this.width;
				document.@height = this.height;

				if(this.includeBackground){
					document['@enable-background']='new '+String(this.x)+' '+String(this.y)+' '+String(this.width)+' '+String(this.height);
				}
				var outputObject = {};
				outputObject.string= this.docString + document.toXMLString();
				if(this.compactOutput){
					outputObject.string = outputObject.string.split("  ").join("");
					outputObject.string = outputObject.string.split("\n").join("");
					// Some older versions of Chrome (and possibly others) have a bug that requires a newline before closing the symbol tag
					outputObject.string = outputObject.string.split("</symbol>").join("\n</symbol>");
				}
				outputObject.id = document.@id.toString();

				if(this._showMiterWarning){
					fl.trace("WARNING: Miter joins display incorrectly in current versions of Firefox (Oct 2014)");
				}

				fl.trace("finalise: "+timeline.filePath);
				this.qData.push(closure(this.processFixUseLinks, [outputObject], this));
				this.qData.push(closure(this.processCompactColours, [outputObject], this));
				this.qData.push(closure(this.processRemoveIdentMatrices, [outputObject], this));
				this.qData.push(closure(this.processConvertHairlineStrokes, [outputObject], this));
				this.qData.push(closure(this.processSaveFile, [outputObject, timeline.filePath], this));
					
				//}
			}
			if(ext.log){
				ext.log.pauseTimer(timer);
			}
		},
		getExportedPaths:function(){
			var ret = "[";
			for(var k=0; k<this.timelines.length;k++){
				var timeline = this.timelines[k];
				var uri = timeline.filePath.replace("file:///", "file://").replace("|", ":");
				var path = FLfile.uriToPlatformPath(timeline.filePath);

				ret += '{"uri":"'+uri+'","path":"'+path+'"}';
			}
			ret += "]";
			return ret;
		},
		processFixUseLinks:function(outputObj){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG.processFixUseLinks()');	
			}
			outputObj.string = outputObj.string.replace(
									/(<[^>]*?)xlink-(.*?)="/g,
									'$1xlink:$2="'
								);
			if(ext.log){
				ext.log.pauseTimer(timer);
			}
		},
		processCompactColours:function(outputObj){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG.processCompactColours()');	
			}
			outputObj.string = outputObj.string.replace(
									/#([0-9A-F])\1([0-9A-F])\2([0-9A-F])\3/gi,
									'#$1$2$3'
								);
			if(ext.log){
				ext.log.pauseTimer(timer);
			}
		},
		processRemoveIdentMatrices:function(outputObj){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG.processRemoveIdentMatrices()');	
			}
			outputObj.string = outputObj.string.replace(' transform="matrix(1 0 0 1 0 0)"','');
			outputObj.string = outputObj.string.replace(" transform='matrix(1 0 0 1 0 0)'",'');
			if(ext.log){
				ext.log.pauseTimer(timer);
			}
		},
		processConvertHairlineStrokes:function(outputObj){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG.processConvertHairlineStrokes()');	
			}
			outputObj.string = outputObj.string.replace(' stroke="0"',' stroke="0.1"');
			outputObj.string = outputObj.string.replace(" stroke='0'",' stroke="0.1"');
			if(ext.log){
				ext.log.pauseTimer(timer);
			}
		},
		processSaveFile:function(outputObj, filePath){
			//if(this.timelines.length==1){
				success=FLfile.write(filePath, outputObj.string);
			/*}else{
				var rPath=decodeURIComponent(
					String(
						outputObj.id
					).replace(
						this.MODULO_STAND_IN,
						'%',
						'g'
					)
				);
				var rPathArray=rPath.split('/');
				for(var n=0;n<rPathArray.length;n++){
					rPathArray[n]=rPathArray[n].safeFileName();
				}
				rPath=rPathArray.join('/');
				if(rPathArray.length>1){
					var rDir=rPath.dir;
					if(!FLfile.exists(rDir)){
						FLfile.createFolder(this.file+'/'+rDir);
					}
				}
				var outputPath=(
					this.file+'/'+
					rPath+'.svg'
				);
				success=FLfile.write(
					outputPath,
					outputObj.string
				);
			}*/
			if(!success){
				ext.warn('Problem writing '+filePath);
			}
		},
		processCleanup:function(){
			fl.showIdleMessage(true);
			if(this.log){
				ext.stopLog();
			}

			/*
			 * cleanup temporary scenes
			 */
			for(var i in this._timelineCopies){
				var list = this._timelineCopies[i];
				for(var j=0; j<list.length; ++j){
					var pack = list[j];
					if(!pack.clone.libraryItem){
						var sceneIndex = ext.doc.timelines.indexOf(pack.clone.$);
						ext.doc.editScene(sceneIndex);
						ext.doc.deleteScene();
					}
				}
			}
			/*
			 * cleanup temporary items
			 */
			if(ext.lib.itemExists(this._tempFolder)){
				ext.lib.deleteItem(this._tempFolder);	
			}

			this._timelineCopies = {};
			ext.sel=this._origSelection;
			var epSuccess=true;
			if(this.swfPanel){
				epSuccess=this.swfPanel.call('endProgress');	
			}
			/*if(this._origTimeline.libraryItem){
				ext.doc.library.editItem(this._origTimeline.libraryItem.name);
			}else{
				ext.doc.editScene(ext.doc.timelines.indexOf(this._origTimeline));
			}*/

			var initial = this._originalEditList[0];
			if(!initial.itemType){
				ext.doc.editScene(this._originalEditList[0]);
				var frame = this._originalFramesList[0];
				ext.doc.getTimeline().currentFrame = frame;
			}else{
				ext.doc.library.editItem(this._originalEditList[0].name);
			}

			for(var i=1; i<this._originalEditList.length; i++){
				var element = this._originalEditList[i];
				frame = this._originalFramesList[i];
				ext.doc.selection = [element];
				ext.doc.enterEditMode("inPlace");
				ext.doc.getTimeline().currentFrame = frame;
			}


			if(epSuccess){
				ext.message('Export Successful: ');
				for(var i=0; i<this.timelines.length; ++i){
					ext.message('\t'+this.timelines[i].filePath);
				}
			}
		},
		/**
		 * Expands symbol instances ( use tags ).
		 * @parameter {XML} xml An svg document or graphic element.
		 * @parameter {Boolean} recursive
		 * @parameter {XML} defs
		 */
		expandUseNow:function( xml, within, onlyOnceUsed, recursive, defs ){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG.expandUseNow()');	
			}
			defs = defs||xml.defs;
			if(recursive==undefined){
				recursive=true;
			}
			var rootIsUse=(
				within.localName()=='use'
			);
			var nodesFound = (rootIsUse?within:(recursive?within..use:within.use));

			var useNodes = {};
			for each(var useNode in nodesFound){
				if( useNode.localName()!='use' || !useNode['@xlink-href'] ){
					continue;
				}
				var id=String(useNode['@xlink-href']).slice(1);
				var list = useNodes[id];
				if(list){
					list.push(useNode);
				}else{
					useNodes[id] = [useNode];
				}
			}
			for(var id in useNodes){

				var symbol=defs.symbol.(@id.toString()==id);

				if(!symbol || !symbol.length() || (recursive=='nested' && !(symbol[0]..use && symbol[0]..use.length()))){
					continue;
				}
				symbol=symbol[0].copy();
				var useList = useNodes[id];
				if(onlyOnceUsed && useList.length>1){
					continue;
				}

				this.executeExpandUse(id, symbol, useList, defs);
			}
			if( rootIsUse && recursive ){
				this.expandUseNow( xml, within, onlyOnceUsed, recursive, defs );
			}
			if(ext.log){
				ext.log.pauseTimer(timer);
			}
			return xml;
		},
		executeExpandUse:function(id, symbol, useList, defs){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG.executeExpandUse()');	
			}
			var doRemove =  true;
			for(var i=0; i<useList.length; ++i){
				var useNode = useList[i];
				if(i==0 && useList.length==1){
					if(symbol.parent())delete symbol.parent().children()[symbol.childIndex()];
					useNode.parent().insertChildAfter(useNode, symbol);
					symbol.setName('g');
					//if(useNode.@id)symbol.@id = useNode.@id;
					// if(useNode.@width)symbol.@width = useNode.@width;
					// if(useNode.@height)symbol.@height = useNode.@height;
					// if(useNode.@x)symbol.@x = useNode.@x;
					// if(useNode.@y)symbol.@id = useNode.@y;
					delete useNode['@xlink-href'];
					// delete useNode['@width'];
					// delete useNode['@height'];
					// delete useNode['@x'];
					// delete useNode['@y'];
					this.copyNodeContents(useNode, symbol);
					delete useNode['@id'];
					// delete symbol['@viewBox'];
					delete symbol['@overflow'];

					if(useNode.@transform.length() && useNode.@transform!=this.IDENTITY_MATRIX)symbol.@transform = useNode.@transform;
					delete useNode.parent().children()[useNode.childIndex()];

					useNode = symbol;

					doRemove = false;
				}else{
					var symCopy = symbol[0].copy();
					this.copyNodeContents(symCopy, useNode);
					useNode.setName('g');
					//useNode['@id']=this._uniqueID(String(symbol['@id'])+'_1');
					delete useNode['@xlink-href'];
					// delete useNode['@width'];
					// delete useNode['@height'];
					// delete useNode['@x'];
					// delete useNode['@y'];
					// delete useNode['@viewBox'];
					delete useNode['@overflow'];
					if(useNode['@transform']==this.IDENTITY_MATRIX){
						delete useNode['@transform'];
					}
					for each(var node in useNode..*){
						if(node.@id.length() && node.localName()!='mask'){
							node.@id=this._uniqueID(String(node.@id));
						}
						if(node.@mask.length()){
							var oldID=String(node.@mask).match(/(?:url\(#)(.*?)(?:\))/);
							if(oldID && oldID.length>1){
								var newID=this._uniqueID(oldID[1]);
								var old=useNode.(@id.toString()==oldID[1]);
								if(old.length()){
									old[0].@id=newID;
									node.@mask='url(#'+newID+')';
								}
							}
						}
						for each(var attr in node.@*){
							if(attr.name()!='id'){
								var ida=String(attr).match(/(?:url\(#)(.*?)(?:\))/);
								if(ida && ida.length>1){
									var origDef=defs.*.(@id.toString()==ida[1]);
									if(origDef && origDef.length()){
										var newDef=origDef[0].copy();
										var newID=this._uniqueID(ida[1]);
										newDef.@id=newID;
										node['@'+attr.name()]='url(#'+newID+')';
										defs.appendChild(newDef);
									}
								}
							}
						}
					}

					useNode = symCopy;
				}
			}
			if(ext.log){
				ext.log.pauseTimer(timer);
			}
			if(doRemove && symbol.parent()){
				delete symbol.parent().children()[symbol.childIndex()];
			}
		},
		/**
		 * Deletes unreferenced defs.
		 * @parameter {XML} xml
		 */
		_deleteUnusedFilters:function(xml){
			if(!xml.defs || xml.defs.length()==0){
				return xml;	
			}
			var filtered = xml.descendants().(function::attribute('filter').length() && @['filter']!=null);
			var references = xml.defs.children();
			for(var i=references.length()-1; i>=0; i--){
				var def = references[i];
				if(def.localName()!="filter")continue;

				var id = "url(#"+def.@id.toString()+")";
				if(filtered.(@filter.toString()==id).length()==0){
					delete xml.defs.children()[i];
				}
			}
		},
		/**
		 * Retrieves a list of references used.
		 * @parameter {XML} xml
		 */
		// _listReferences:function(xml,defs){
		// 	defs=defs||xml.defs;
		// 	var refs=new ext.Array();
		// 	if(!defs){return refs;}
		// 	for each(var x in xml.*){
		// 		if(x.localName()!='defs'){
		// 			for each(var a in x.@*){
		// 				if(
		// 					a.localName()=='id' ||
		// 					a.localName()=='d'
		// 				){
		// 					continue;
		// 				}
		// 				var reference=(
		// 					String(a).match(/(?:url\(#)(.*?)(?:\))/)||
		// 					String(a).trim().match(/(?:^#)(.*$)/)
		// 				);
		// 				if(
		// 					(reference instanceof Array) &&
		// 					reference.length>1
		// 				){
		// 					var ref=defs.*.(@id==reference[1]);
		// 					if(ref && ref.length()){
		// 						refs.push(reference[1]);
		// 						refs.extend(this._listReferences(ref[0],defs));
		// 					}
							
		// 				}
		// 			}
		// 			if(x.*.length()){
		// 				refs.extend(
		// 					this._listReferences(x,defs)
		// 				);
		// 			}
		// 		}
		// 	}
		// 	return refs;
		// },
		/**
		 * Loads an xml settings file.
		 * @parameter {String} uri The location of the settings file.
		 */
		loadSettings:function(xml){
			if(typeof(xml)=='string'){
				xml=new XML(xml);
			}
			for each(var x in xml.*){
				var key=String(x.name());
				if(
					['true','false','True','False'].indexOf(String(x))>-1
				){
					this[key]=(
						String(x)!=='false' &&
						String(x)!=='False' &&
						String(x)!=='0'
					);
				}else if(
					String(x).replace(/[^\d\.\-\W]/g,'')==String(x)
				){
					this[key]=Number(x);
				}else{
					this[key]=String(x);
				}
			}
			return xml;
		},

		processElement:function(node, element, settings, dom){
			var elementXML=this._getElement(element,settings);
			if(elementXML){
				//var list = dom..g.(@id.toString()==id);
				//if(list.length()==1){
					//var node = list[0];
					var parent = node.parent();
					this.copyNodeContents(node, elementXML);
					parent.insertChildBefore(node, elementXML);
					delete parent.children()[node.childIndex()];
				// }else{
				// 	ext.warn("Error: multiple items with the same id found ("+id+")");
				// }
			}
		},
		copyNodeContents:function(fromNode, toNode){
			for(var i=0; i<fromNode.attributes().length(); i++){
				var attr = fromNode.attributes()[i];
				toNode.@[attr.name()] = attr.toXMLString();
			}
			var children = fromNode.children();
			for(var i=children.length()-1; i>=0; i--){
				var child = children[i];
				toNode.prependChild(child);
			}
		},
		/**
		 * Retrieves the svg data corresponding to a DOM Element.
		 * @parameter {extensible.Element} element
		 * @parameter {Object} options Options object, contents dependant on element type.
		 * @private
		 */
		_getElement:function(element, options){
			var settings=new ext.Object({});
			settings.extend(options);
			var result;
			/*if(this.swfPanel){
				var progressIncrements=this._getProgressIncrements(
					element,
					settings.frame
				);
				if(progressIncrements){
					this._progress+=progressIncrements;
				}else{
					ext.warn(
						'extensible.SVG.getElement()\n\t'+progressIncrements+'\n\t'+e
					);
				}
			}*/
			if(element instanceof ext.Instance){
				if(element.instanceType=='symbol'){
					result=this._getSymbolInstance(element, settings);
				}else if(element.instanceType=='bitmap'){
					result=this._getBitmapInstance(element, settings);
				}
			}else{
				if(element instanceof ext.Shape){
					result=this._getShape(element,settings);
				}else if(
					element instanceof ext.Text || 
					element instanceof ext.TLFText
				){
					result=this._getText(element,settings);
				}
			}
			if(options.lookupName){
				var symbol = new XML('<symbol/>');
				symbol['@id'] = options.lookupName;
				symbol.appendChild(result);
				this._symbolList.push(symbol);
				return symbol;
			}
			return result;
		},

		_getBoundingBox:function(items, timeline, timelineRef, layerInd, frameInd){
			var ret;
			for(var i=0; i<items.length; ++i){
				var item = items[i];

				var bounds = item;

				if(item.right - item.left < 0 || item.bottom - item.top < 0 || item.left - item.right > 6500000 || item.bottom - item.top > 6500000){
					// element bounds are invalid, attempt to correct

					if(timeline){
						// If this element is in a newly cloned timeline sometimes the correct bounds haven't been calculated
						if(typeof(timelineRef)=="number") ext.doc.editScene(timelineRef);
						else ext.doc.library.editItem(timelineRef);
						timeline.setSelectedLayers(layerInd, true);
						timeline.currentFrame = frameInd;
						bounds = {top:item.top, left:item.left, right:item.right, bottom:item.bottom};
						ext.doc.exitEditMode();
					}
				}
				if(bounds.right - bounds.left > 0 && bounds.bottom - bounds.top > 0){
					if(ret==null){
						ret = {left:bounds.left, right:bounds.right, top:bounds.top, bottom:bounds.bottom};
					}else{
						if(ret.left>bounds.left)ret.left = bounds.left;
						if(ret.top>bounds.top)ret.top = bounds.top;
						if(ret.right<bounds.right)ret.right = bounds.right;
						if(ret.bottom<bounds.bottom)ret.bottom = bounds.bottom;
					}
				}
			}
			if(ret){
				ret.left -= this.VIEW_BOX_PADDING;
				ret.top -= this.VIEW_BOX_PADDING;
				ret.right += this.VIEW_BOX_PADDING;
				ret.bottom += this.VIEW_BOX_PADDING;
				return ret;
			}else{
				return {left:0, right:0, top:0, bottom:0};
			}
		},
		hasTweensInRange:function(options){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG.hasTweensInRange()');	
			}
			var settings=new ext.Object({
				startFrame:0,
				endFrame:this.frames.length,
				includeShapeTweens:true,
				includeMotionTweens:true,
				includeHiddenLayers:ext.includeHiddenLayers,
				includeGuides:false,
				includeGuidedTweens:false,
				includeGraphicChanges:false,
				deselectItems:false
			});
			settings.extend(options);
			var deselect = settings.deselectItems;
			if(deselect){
				// deselection must occur on the original timeline, not a copy or flash crashes
				var layersVis = [];
				var layersLocked = [];
				if(settings.timeline.libraryItem){
					ext.doc.library.editItem(settings.timeline.libraryItem.name);
				}else{
					ext.doc.editScene(ext.doc.timelines.indexOf(settings.timeline.$));
				}
			}
			var ret = false;
			var f=new ext.Array();
			var layers=settings.timeline.$.layers;
			for(var l=0;l<layers.length;l++){
				var layer = layers[l];
				if( !ret &&
					( layer.visible || settings.includeHiddenLayers ) && 
					( layer.layerType!='guide' || settings.includeGuides) &&
					  layer.layerType!="folder"
				){
					var layerEnd = settings.endFrame+1;
					if(layerEnd>layer.frameCount)layerEnd = layer.frameCount;

					for(var i=settings.startFrame;i<layerEnd;i++){ // check for tweens
						var frame = layer.frames[i];
						if(
							(
								(settings.includeShapeTweens && frame.tweenType=='shape') ||
								(settings.includeMotionTweens && frame.tweenType=='motion') ||
								(settings.includeGuidedTweens && frame.tweenType=='motion' && layer.layerType=="guided")
							) && settings.frame!=frame.startFrame
						){
							ret = true;
							break;
						}
						if( settings.includeGraphicChanges && frame.duration>1){
							var elems = frame.elements;
							for(var j=0; j<elems.length; ++j){
								var elem = elems[j];
								if(elem.symbolType=="graphic" && elem.loop!="single frame"){
									ret = true;
									break;
								}
							}
						}
					}
					if(ret && !deselect)break;
				}
				if(deselect){
					layersVis[l] = layer.visible;
					layersLocked[l] = layer.locked;

					layer.locked = false;
					layer.visible = true;
				}
			}
			if(deselect){
				var end = (settings.endFrame+1 < settings.timeline.frameCount ? settings.endFrame+1 : settings.timeline.frameCount)
				for(var i=settings.startFrame;i<end;i++){
					settings.timeline.currentFrame = i;
					if(ext.doc.selection.length){
						ext.doc.selectNone();
					}
				}
				for(var l=0;l<layers.length;l++){
					var layer = layers[l];
					layer.locked = layersLocked[l];
					layer.visible = layersVis[l];
				}
			}
			if(settings.timeline.libraryItem)ext.doc.exitEditMode();
			if(ext.log) ext.log.pauseTimer(timer);
			return ret;	
		},
		/**
		 * Retrieves the SVG data corresponding to a timeline.
		 * @parameter {extensible.timeline) timeline
		 * @parameter {Object} options
		 * @parameter {Number} [options.frame] The frame number.
		 * @parameter {Number} [options.id] The id to use for the element.
		 * @parameter {Matrix} [options.matrix]
		 * @parameter {Item} [options.libraryItem] The library item 
		 * @parameter {String} [options.color] A hexadecimal color value.
		 * @private
		 */
		_getTimeline:function(timeline, options){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG._getTimeline()');	
			}
			var settings=new ext.Object({
				startFrame:0,
				endFrame:timeline.frames.length,
				selection:undefined,
				id:undefined,
				matrix:new ext.Matrix(),
				libraryItem:undefined,
				color:undefined,
				isRoot:false,
				animOffset:0,
				referenceShapes:false
			});
			settings.extend(options);
			if(typeof(settings.color)=='string'){
				settings.color=new ext.Color(settings.color);
			}
			var dom = settings.dom;
			/*
			 * Group elements by layer.
			 */
			//var selection=settings.selection.byFrame({stacked:true});
			var xml,instanceXML,id;
			var frameCount = timeline.$.frameCount;

			if(settings.startFrame > frameCount-1){
				settings.startFrame = frameCount-1;
			}
			if(settings.endFrame > frameCount){
				settings.endFrame = frameCount;
			}

			if(settings.frameCount==null){
				settings.frameCount = settings.endFrame - settings.startFrame;
			}else{
				if(settings.endFrame > settings.startFrame+settings.frameCount){
					settings.endFrame = settings.startFrame+settings.frameCount;
				}
			}
			var timelineName = timeline.libraryItem?timeline.libraryItem.name:timeline.name;
			var timelineRef = options.timelineRef == null ? timeline.libraryItem.name : timelineRef;

			var symbolIDString = timelineName.split("/").join("_");
			if(settings.color){
				symbolIDString += '_'+settings.color.idString; //should factor this out and use a transform
			}
			if(frameCount>1){
				var offset = settings.animOffset;
				if(settings.frameCount==1){
					symbolIDString += '_f'+settings.startFrame;
				}else if(settings.animOffset!=null && settings.animOffset>0){
					symbolIDString += '_t'+settings.animOffset;
				}
				if(settings.totalDuration > settings.frameCount){
					symbolIDString += '_d'+settings.totalDuration;
				}
				if(settings.repeatCount!="indefinite"){
					symbolIDString += '_l'+settings.repeatCount;
				}
			}
			var isNew,boundingBox;
			if(this._symbols[symbolIDString]){
				isNew=false;
				xml = this._symbols[symbolIDString];
				id = xml.@id.toString();
				boundingBox = this._symbolBounds[symbolIDString];
			}else{
				isNew=true;
				id = this._uniqueID(symbolIDString);

				/*
				 * Check to see if the timeline has tweens that we need to resolve.
				 */
				 var hasTweens=this.hasTweensInRange({ // get a list of currently visible frames
						timeline:timeline,
						startFrame:settings.startFrame,
						endFrame:settings.endFrame,
						includeHiddenLayers:this.includeHiddenLayers,
						includeGuides:this.includeGuides,
						includeMotionTweens:true,
						includeGuidedTweens:true,
						includeGraphicChanges:true,
						deselectItems:true
					});

				 var origTimeline = settings.libraryItem;

				/*
				 * Create temporary timelines where tweens exist & convert to
				 * keyframes.
				 */
				var originalScene,timelines;
				if(hasTweens){
					/*if(settings.libraryItem==undefined){
						originalScene=timelineName;
					}*/
					timeline = this._getTimelineCopy(settings.libraryItem, timeline, settings.startFrame, settings.endFrame);
					var layers = timeline.$.layers;

					if(ext.log){
						var timer2=ext.log.startTimer('extensible.SVG._getTimeline() >> Check break apart tweens');	
					}
					for(var i=0;i<layers.length;i++){
						var layer=layers[i];
						if(layer.layerType=="guide" || layer.layerType=="folder")continue;

						var layerEnd = settings.endFrame;
						if(layerEnd > layer.frameCount)layerEnd = layer.frameCount;

						var layerSelected = false;
						for(var n=settings.startFrame; n<layerEnd; ++n){
							var frame=layer.frames[n];
							var start=frame.startFrame;
							var startFrame=layer.frames[start];
							var breakApart = false;
							var firstElement = frame.elements[0];
							if(  frame.tweenType=='shape' || 
								(n==frame.startFrame && layer.layerType=="guided" && frame.tweenType!="none") ||
								(settings.flattenMotion && frame.tweenType=="motion") ||
								(n==settings.startFrame && start!=n && startFrame.tweenType!='none') || // this backtracks from the first frame if our range starts mid-tween
								(n==settings.endFrame && start!=n && startFrame.tweenType!='none' && layer.frameCount>settings.endFrame+1)// ||// this breaks apart tweens which fall over the end of our range
								//(n==frame.startFrame && frame.elements.length==1 && frame.elements[0].symbolType=="graphic"/* && frame.elements[0].loop!="single frame"*/)// graphic runs should be broken down into single frames (but only when the run is out of sync with the master timeline)
								){
								breakApart = true;

							}else if(n==frame.startFrame && frame.duration>1 && frame.elements.length==1 && firstElement.symbolType=="graphic" && firstElement.loop!="single frame"){
								// if all frames in a graphic run resolve to the same frame then don't break it apart.
								// Otherwise break it apart so graphic frames can be referrenced
								var resolvedFrame = this._getPriorFrame(firstElement.libraryItem.timeline, firstElement.firstFrame);
								for(var k=0; k<frame.duration; ++k){
									if(this._getPriorFrame(firstElement.libraryItem.timeline, firstElement.firstFrame + k) != resolvedFrame){
										breakApart = true;
										break;
									}
								}
								// This screws up chained keyframes
								/*if(!breakApart){
									firstElement.loop = "single frame";
								}*/
							}
							if(breakApart){
								if(!layerSelected){
									layerSelected = true;
									timeline.$.setSelectedLayers(i);
								}
								var end = start+frame.duration;
								timeline.$.convertToKeyframes(start, end);
								for(var v=start; v<end; v++){
									var frame = layer.frames[v];
									frame.hasCustomEase = false;
								}
								n = end-1;
							}

						}
					}
					if(ext.log){
						ext.log.pauseTimer(timer2);
					}
				}else{
					var layers = timeline.$.layers;
				}
				/*
				 * Retrieve elements in the current frames, get bounding box
				 */
				if(!settings.selection){
					var frames = [];
					for(var i=0;i<layers.length;i++){
						var layer=layers[i];
						var layerEnd = settings.endFrame+1;
						if(layerEnd > layer.frameCount)layerEnd = layer.frameCount;

						for(var n=settings.startFrame; n<layerEnd; ++n){
							var frame=layer.frames[n];
							frames.push(frame);
						}
					}
					var options={
						includeHiddenLayers:this.includeHiddenLayers,
						includeGuides:this.includeGuides,
						frames:frames
					};
					var items = timeline.getElements(options);
					boundingBox =this._getBoundingBox(items);
				}else{
					boundingBox = this._getBoundingBox(settings.selection);
				}
				this._symbolBounds[symbolIDString] = boundingBox;
			}
			//ext.message("\ngetTimeline: "+symbolIDString+" "+settings.startFrame+" "+settings.endFrame+" "+settings.frameCount+" "+isNew);
			//var instanceID = this._uniqueID(id);
			instanceXML=new XML('<use xlink-href="#'+id+'" />');
			if(isNew){
				// instanceXML['@width']=0;
				// instanceXML['@height']=0;
				// instanceXML['@x']=0;
				// instanceXML['@y']=0;
				//instanceXML['@overflow']="visible";

				xml=new XML('<symbol/>');
				xml['@id']=id;
				xml['@overflow']="visible";

				if(!settings.isRoot){
					this._symbolList.push(xml);
					this._symbols[symbolIDString] = xml;
					this._useNodeMap[id] = [instanceXML];
				}else{
					settings.beginAnimation = settings.beginAnimation.split("${root}").join(id);
				}

				var forceDiscrete = settings.flattenMotion && settings.discreteEasing;
				var animDur;

				if(this.animated){
					var totFrames = (settings.endFrame - settings.startFrame);

					var animNode = <animate
								      attributeName="display"/>;

					var beginAnim;
					if(settings.beginAnimation=="0s"){
						beginAnim = (settings.beginOffset ? settings.beginOffset + "s": "0s");
					}else{
						beginAnim = settings.beginAnimation + (settings.beginOffset ? "+" + settings.beginOffset + "s" : "");
					}
					if(beginAnim!="0s")animNode.@begin = beginAnim;

					if(settings.repeatCount.charAt(settings.repeatCount.length-1)=="s"){
						animNode.@repeatDur = settings.repeatCount;
					}else{
						animNode.@repeatCount = settings.repeatCount;
					}


					if(settings.totalDuration!=null){
						animDur = settings.totalDuration;
					}else{
						animDur = totFrames;
					}
					if(settings.loopTweens){
						animDur -= 1;
					}

					animNode.@dur = this.precision( animDur / ext.doc.frameRate )+"s";
				}else{
					animDur = 0;
				}
				var timeDur = this.precision(animDur / ext.doc.frameRate);
				var timeGranularity = String(1/animDur);
				var timePrecision = 1;
				timeGranularity = timeGranularity.substr(timeGranularity.indexOf("."));
				while(timeGranularity.charAt(timePrecision)=="0"){
					timePrecision++;
				}
				if(timePrecision < this.decimalPointPrecision){
					timePrecision = this.decimalPointPrecision;
				}
				var animatedFrames = {};

				/*
				 * Loop through the visible frames by layer &
				 * either take note of the elements for linear
				 * processing ( enables use of a progress bar ), 
				 * or process them immediately ( for debugging purposes ).
				 */
				var masked=new ext.Array();
				var maskId = null;
				for(var i=0;i<layers.length;i++){
					var layer=layers[i];
					if(layer.layerType=="guide" || layer.layerType=="folder")continue;

					var layerEnd = settings.endFrame;
					if(layerEnd > layer.frameCount)layerEnd = layer.frameCount;

					var doAnim = this.animated && settings.endFrame-settings.startFrame>1 && settings.frameCount!=1;

					var lVisible=layer.visible;
					var lLocked=layer.locked;
					if(!lVisible){
						layer.visible=true;
					}
					if(lLocked){
						layer.locked=false;
					}

					if(masked.length && layer.layerType!='masked'){
						// masked layers have ended group
						this._doMask(xml, masked, maskId);
					}

					var frameCacheList = [];

					var colorX=null;
					var isMask = false;
					var isMasked = false;
					if(layer.layerType=='mask'){
						isMask = true;
						if(this.maskingType=='alpha'){
							// This makes semi-transparent parts of masks fully opaque
							colorX=new ext.Color('#FFFFFF00');
						}else if(this.maskingType=='clipping'){
							colorX=new ext.Color('#FFFFFF00');
							colorX.percent[3]=999999999999999;						
						};
					}else if(layer.layerType=='masked' && (
								layer.parentLayer && 
								(layer.parentLayer.visible || this.includeHiddenLayers) &&
								(layer.parentLayer.layerType!='guide' || this.includeGuides))){
						isMasked = true; 
					}
					var frames = layer.frames;
					var n=settings.startFrame;
					layerSelected = false;
					while( n<layerEnd ){
						if(ext.log){
							var timer2=ext.log.startTimer('extensible.SVG._getTimeline() >> Get frame items');	
						}
						var frame = new ext.Frame(frames[n]);
						var tweenType = frame.tweenType;

						var items = this._getItemsByFrame(frame, settings.selection);
						if(items.length==0){
							if(!frame.soundName){
								n += frame.duration;
								continue;
							}
						}else{
							var itemBounds = this._getBoundingBox(items, timeline, timelineRef, i, n);
							if(boundingBox.left>itemBounds.left)boundingBox.left = itemBounds.left;
							if(boundingBox.top>itemBounds.top)boundingBox.top = itemBounds.top;
							if(boundingBox.right<itemBounds.right)boundingBox.right = itemBounds.right;
							if(boundingBox.bottom<itemBounds.bottom)boundingBox.bottom = itemBounds.bottom;
						}

						if(this.animatedViewBox && settings.isRoot && items.length==1 && items[0].name=="viewBox"){
							n += this._createViewBoxAnim(xml, settings.beginAnimation, timeline, layer, frame, n, items[0], settings.startFrame, settings.endFrame, timeDur, timePrecision, settings.repeatCount);
							continue;
						}

						var frameXML;
						var startType = layer.frames[frame.startFrame].tweenType;
						if(this.animated && (animatedFrames[i+"-"+n] || (frame.startFrame!=n && n!=settings.startFrame && (startType=='none' || (!settings.flattenMotion && startType=="motion"))))){
							// Skip frames that haven't changed or are motion tweens (when in animation mode).
							n += frame.duration;
							continue;
						}

						if(layers.length==1){
							var layerFrameId = id+"_"+n;
						}else{
							var layerFrameId = id+"_"+i+"_"+n;
						}
						/*
						 * If the masking type is "Alpha" or "Clipping"
						 * we need to manipulate the color of the mask to ensure
						 * the proper behavior
						 */
						//var filtered;
						if(isMask){
							frameXML=<mask id={layerFrameId}/>;
							maskId = layerFrameId;
							if(colorX){
								//filtered=<g id={this._uniqueID('g')} />;
								//frameXML.appendChild(filtered);
								//filtered = frameXML;
								if(!this._maskFilter){
									this._maskFilter=this._getFilters(
										null,frameXML,{
											color:colorX,
											boundingBox:boundingBox
										}, dom.defs
									);
								}
								if(this._maskFilter){
									frameXML.@filter="url(#"+this._maskFilter+")";
								}
							}
						}else{
							frameXML=new XML('<g />');
						}
						if(frame.soundName && this.animated){
							this._addSoundNode(dom.defs, frameXML, frame, settings.beginAnimation, settings.beginOffset, n);
						}
						if(ext.log){
							ext.log.pauseTimer(timer2);
						}

						var doCollateFrames = (doAnim && items.length==1 && tweenType!="shape" && items[0].$.elementType=="instance");
						var frameEnd = n+1;
						var transToDiff = false;
						if(doCollateFrames){
							if(ext.log){
								var timer2=ext.log.startTimer('extensible.SVG._getTimeline() >> Collate frames');	
							}
							var mainElem = frame.elements[0];
							var childFrame = mainElem.firstFrame;
							//if(mainElem.loop=="single frame" || frame.duration==1){
							if(mainElem.symbolType=="graphic"){
								var singleFrameStart = this._getPriorFrame(mainElem.libraryItem.timeline, mainElem.firstFrame);
							}
							var lastFrame = frame;
							while(frameEnd < layerEnd){
								var nextFrame = layer.frames[frameEnd];
								if(nextFrame){
									if(nextFrame.startFrame==frameEnd){
										// keyframe
										var nextElem = nextFrame.elements[0];
										if(!nextElem || nextFrame.elements.length!=1 ||
											(nextElem.libraryItem!=mainElem.libraryItem && lastFrame.tweenType=='none')){ // tweening to a different symbol with no tween between, do not tween
											break; // tweening to incompatible frame

										}else if(nextElem.libraryItem!=mainElem.libraryItem || mainElem.symbolType!=nextElem.symbolType || 
														(mainElem.symbolType=="graphic" && mainElem.libraryItem.timeline.frameCount>1 &&
													    ((nextElem.loop!=mainElem.loop && !((mainElem.loop=="single frame" || frame.duration==1) && (nextElem.loop=="single frame" || nextFrame.duration==1)))
													// || (nextElem.loop!="single frame" && nextFrame.duration!=1) 
													 || (singleFrameStart!=this._getPriorFrame(nextElem.libraryItem.timeline, nextElem.firstFrame/* + (nextElem.loop=="single frame"?0:nextFrame.duration)*/)))
													    )){
											//tweening to different symbol
											++frameEnd;
											transToDiff = true;
											break;
										}
									}
									++frameEnd;
								}else{
									break;
								}
								lastFrame = nextFrame;
							}
							if(lastFrame && lastFrame.startFrame!=frameEnd-1 && lastFrame.tweenType!="none"){
								if(!layerSelected){
									layerSelected = true;
									timeline.$.setSelectedLayers(i);
								}
								timeline.$.convertToKeyframes(frameEnd-1, frameEnd-1);
							}
							if(ext.log){
								ext.log.pauseTimer(timer2);
							}
						}else if(doAnim && tweenType=='none'){
							while(frameEnd<layerEnd && layer.frames[frameEnd].startFrame==frame.startFrame){
								frameEnd++;
								// this will add in extra time for frames with non changing content (which won't be included as a real frame)
							}
						}

						var frameHasAnimated = false;

						for(var j=0; j<items.length; ++j){
							var element = items[j];
							element.timeline = timeline;
							//var elementID=this._uniqueID('element');
							var elemSettings = {
										frame:n,
										dom:dom,
										animOffset:(settings.animOffset + n - settings.startFrame),
										frameCount:(frameEnd - n),
										totalDuration:animDur,
										beginAnimation:settings.beginAnimation,
										beginOffset:0,
										repeatCount:settings.repeatCount,
										loopTweens:false,
										discreteEasing:this.discreteEasing,
										flattenMotion:settings.flattenMotion
									};

							if(element.elementType=="shape" && settings.referenceShapes){
								elemSettings.lookupName = timelineName+"_"+i+"."+frame.startFrame+(items.length>1?"."+j:"");

							}else if(element.symbolType=="graphic"){
								elemSettings.frameCount = 1;
								var childFrame = element.firstFrame;
								if(element.loop!="single frame")childFrame += (n - frame.startFrame);
								elemSettings.startFrame = this._getPriorFrame(element.timeline, childFrame);

							}else if(element.symbolType=="movie clip"){
								if((element.libraryItem.timeline.frameCount<(frameEnd-n)) && frameEnd>n+1 && settings.repeatCount!="indefinite"){
									// this changes from an animation with the same duration as the parent timeline to one with a shorter duration (and a repearDur)
									elemSettings.beginOffset = settings.beginOffset + this.precision(elemSettings.animOffset / ext.doc.frameRate);
									elemSettings.animOffset = 0;
									elemSettings.frameCount = element.libraryItem.timeline.frameCount;
									elemSettings.totalDuration = elemSettings.frameCount;
									elemSettings.repeatCount = this.precision((frameEnd - n) / ext.doc.frameRate)+"s";
								}else{
									elemSettings.loopTweens = settings.loopTweens;
									if(settings.startFrame==0 && frameEnd==timeline.frameCount){
										// When a child timeline spans the entirity of it's parent, it is allowed to maintain it's own loop 
										elemSettings.beginOffset = settings.beginOffset;
										elemSettings.animOffset = settings.animOffset;
										elemSettings.frameCount = element.libraryItem.timeline.frameCount;
										elemSettings.totalDuration = elemSettings.frameCount;
									}
								}
							}
							if(element.instanceType=="symbol" && element.blendMode!="normal"){
								ext.warn('Blend modes are not yet supported (in timeline "'+timeline.name+'", layer '+(i+1)+' at frame '+(j+1)+")");
							}

							if(!elemSettings.lookupName || !this._symbols[elemSettings.lookupName]){
								if(this._delayedProcessing){
									var elementXML = new XML( elemSettings.lookupName ? '<symbol overflow="visible"/>' : '<g/>' );
									this.qData.push(closure(this.processElement, [elementXML, element, elemSettings, dom], this));
								}else{
									var elementXML = this._getElement( element, elemSettings );
								}
							}else{
								var elementXML = null;
							}
							
							
							if(elemSettings.lookupName){
								//var symbol = this._symbols[elemSettings.lookupName];
								if(elementXML){
									this._symbols[elemSettings.lookupName] = elementXML;
									dom.defs.appendChild(elementXML);
									this._symbolList.push(elementXML);
								}
								var useNode = new XML('<use xlink-href="#'+elemSettings.lookupName+'" />');
								frameXML.appendChild( useNode );
								var useList = this._useNodeMap[elemSettings.lookupName];// = [useNode];
								if(!useList){
									this._useNodeMap[elemSettings.lookupName] = [useNode];
								}else{
									useList.push(useNode);
								}

							}else if(elementXML){
								frameXML.appendChild(elementXML);
							}

							if(!doCollateFrames && element.elementType=="instance"){
								//var colTransNode = this._addColorTrans(elementXML, element, !doCollateFrames);
								var filterID=this._getFilters(element, elementXML, elemSettings, dom.defs, null);
								if(filterID && dom.defs.filter.(@id.toString()==filterID).length()){
									elementXML['@filter']='url(#'+filterID+')';
								}
							}
							
						}

						var filterElement = element;
						if(doCollateFrames){
							var transAnimObj = {xList:[], yList:[], scxList:[], scyList:[], skxList:[], skyList:[], rotList:[], trxList:[], tryList:[],
												redOList:[], redMList:[], greenOList:[], greenMList:[], blueOList:[], blueMList:[], alphaOList:[], alphaMList:[],
												timeList:[], splineList:[],
												skxScaleXList:[], skxScaleYList:[], skxTimeList:[], skxSplineList:[],
												skyScaleXList:[], skyScaleYList:[], skyTimeList:[], skySplineList:[],
												transXList:[], transYList:[]};

							if(this.showEndFrame){
								filterElement = lastFrame.elements[0];
							}
							var filterID=this._getFilters(filterElement, elementXML, elemSettings, dom.defs, transAnimObj);
							if(filterID && dom.defs.filter.(@id.toString()==filterID).length()){
								elementXML['@filter']='url(#'+filterID+')';
							}
						}

						if(doAnim){
							
							if(doCollateFrames){
								if(ext.log){
									var timer2=ext.log.startTimer('extensible.SVG._getTimeline() >> Get keyframes');	
								}

								var matrix;
								var allowRotateList = [];
								var lastElement = null;
								var maxRot;
								var minRot;
								for(var nextInd = n; nextInd<frameEnd; ++nextInd){
									var nextFrame = layer.frames[nextInd];
									if(nextFrame.startFrame!=nextInd && n!=nextInd)continue;
									var nextElement = nextFrame.elements[0];
									if(lastElement){
										allowRotateList.push((nextElement.skewX > nextElement.skewY) == (lastElement.skewX > lastElement.skewY));
									}
									if(minRot==null || nextElement.skewX < minRot)minRot = nextElement.skewX;
									if(maxRot==null || nextElement.skewX < maxRot)maxRot = nextElement.skewX;
									lastElement = nextElement;
								}
								var withinQuad = (maxRot - minRot) <= 90;
								allowRotateList.push(allowRotateList[allowRotateList.length-1]);
								if(this.showEndFrame){
									matrix = new ext.Matrix(lastElement.matrix);
								}else{
									nextElement = element;
									matrix = element.matrix.clone();
								}
								var invMatrix = new ext.Matrix();
								var firstRot = 0;
								var firstScX = 0;
								var firstScY = 0;
								var firstSkX = 0;
								var firstSkY = 0;
								
								var lastRot = 0;
								var lastFrame = frame;
								var autoRotate = 0;
								var lastSkX = null;
								var lastSkY = null;
								var lastTime;
								var startTime = settings.startFrame / ext.doc.frameRate;

								var mainElem = frame.elements[0];
								//var loopAnim = (settings.loopTweens && n==settings.startFrame && frameEnd==settings.endFrame && settings.repeatCount=="indefinite" && layer.frames[frameEnd-1].startFrame==frameEnd-1);
								//loopAnim = false;
								//var addTweenKiller = false;
								var keyframeI = 0;
								for(var nextInd = n/*+1*/; nextInd<frameEnd; ++nextInd){
									var nextFrame = layer.frames[nextInd];
									if(nextFrame.startFrame!=nextInd)continue;

									if(nextFrame.soundName && this.animated){
										this._addSoundNode(dom.defs, frameXML, nextFrame, settings.beginAnimation, settings.beginOffset, nextInd);
									}

									var allowSkewRot = allowRotateList[keyframeI] || withinQuad;
									keyframeI++;

									var attemptForeRot = true;
									var attemptBackRot = true;
									//var time = (settings.animOffset+nextInd/ext.doc.frameRate)/animDur;
									var time = (settings.animOffset + nextInd) / ext.doc.frameRate;
									var isLast = (nextFrame.duration + nextInd >= frameEnd);
									/*if(addTweenKiller){
										var smallT = this.precision(time-1/Math.pow(10, this.decimalPointPrecision));
										transAnimObj.timeList.push(smallT);
									}else */if(lastFrame.tweenType=="motion"){
										switch(lastFrame.motionTweenRotate){
											case "clockwise":
												if(lastFrame.duration>1)autoRotate += lastFrame.motionTweenRotateTimes*360;
												attemptBackRot = false;
												break;
											case "counter-clockwise":
												if(lastFrame.duration>1)autoRotate += lastFrame.motionTweenRotateTimes*-360;
												attemptForeRot = false;
												break;
										}
									}

									var nextElement = nextFrame.elements[0];
									var rot = this._getRotation(nextElement, allowSkewRot) - firstRot;
									if(nextElement.skewX == nextElement.skewY){
										var skewX = - firstSkX;
										var skewY = - firstSkY;
									}else{
										var skewX = nextElement.skewX - firstSkX;
										var skewY = nextElement.skewY - firstSkY;
									}

									while(attemptForeRot && Math.abs(rot-lastRot)>Math.abs(rot+360-lastRot)){
										rot += 360;
										skewX += 360;
										skewY += 360;
									}
									while(attemptBackRot && Math.abs(rot-lastRot)>Math.abs(rot-360-lastRot)){
										rot -= 360;
										skewX -= 360;
										skewY -= 360;
									}

									// if there is a rotation tween of up to 45 degrees, we add extra bounds to accomodate it.
									var rotDif = Math.abs(lastRot - rot)/180*Math.PI;
									if(rotDif>Math.PI/4)rotDif = Math.PI/4;
									var swingLeft = nextElement.matrix.tx+(nextElement.left-nextElement.matrix.tx)*Math.cos(rotDif)+(nextElement.top-nextElement.matrix.ty)*Math.sin(rotDif);
									var swingTop = nextElement.matrix.ty+(nextElement.top-nextElement.matrix.ty)*Math.cos(rotDif)+(nextElement.left-nextElement.matrix.tx)*Math.sin(rotDif);
									var swingRight = nextElement.matrix.tx+(nextElement.right-nextElement.matrix.tx)*Math.cos(rotDif)+(nextElement.bottom-nextElement.matrix.ty)*Math.sin(rotDif);
									var swingBottom = nextElement.matrix.ty+(nextElement.bottom-nextElement.matrix.ty)*Math.cos(rotDif)+(nextElement.right-nextElement.matrix.tx)*Math.sin(rotDif);
									if(!isMasked){
										if(boundingBox.left>swingLeft)boundingBox.left = swingLeft;
										if(boundingBox.top>swingTop)boundingBox.top = swingTop;
										if(boundingBox.right<swingRight)boundingBox.right = swingRight;
										if(boundingBox.bottom<swingBottom)boundingBox.bottom = swingBottom;
									}

									if(isNaN(rot)){
										rot = rotList.length ? rotList[rotList.length-1] : 0;
									}
									if(nextElement.skewX != nextElement.skewY){
										skewX -= rot;
										skewY -= rot;
									}
									skewX = this._getClosestRotList(-skewX, transAnimObj.skxList);
									skewY = this._getClosestRotList(skewY, transAnimObj.skyList);

			 						//fl.trace("\nframe: "+nextFrame.startFrame);
									//addTweenKiller = (nextFrame.tweenType=="none" && (!loopAnim || !isLast));
									var transPoint = nextElement.getTransformationPoint();
									this.checkSkewQuadrant(skewX, time, lastSkX, lastTime, transAnimObj.skxScaleYList, transAnimObj.skxScaleXList, transAnimObj.skxTimeList, transAnimObj.skxSplineList, transPoint.x, transPoint.y, lastFrame.tweenType!="none")
									this.checkSkewQuadrant(skewY, time, lastSkY, lastTime, transAnimObj.skyScaleXList, transAnimObj.skyScaleYList, transAnimObj.skyTimeList, transAnimObj.skySplineList, transPoint.y, transPoint.x, lastFrame.tweenType!="none")
									this._addAnimFrame(nextFrame, nextElement, invMatrix, time, startTime, forceDiscrete, rot, skewX, skewY, autoRotate, transAnimObj, timeline, i);
									
									lastFrame = nextFrame;
									lastRot = rot;
									lastSkX = skewX;
									lastSkY = skewY;
									lastTime = time;

									if(!transToDiff || nextInd<frameEnd-1){
										animatedFrames[i+"-"+nextInd] = true;
									}
									if(nextFrame.elements.length>1 || nextElement.libraryItem!=element.libraryItem)break;
								}
								var combineSkewScales = false;
								if(transAnimObj.skxTimeList.length == transAnimObj.skyTimeList.length){
									combineSkewScales = true;
									for(var p=0; p<transAnimObj.skxTimeList.length; p++){
										if(transAnimObj.skxTimeList[p]!=transAnimObj.skyTimeList[p]){
											combineSkewScales = false;
											break;
										}
									}
								}
								var hasTransformAnim = this.hasDifferent(transAnimObj.rotList, transAnimObj.skyList, transAnimObj.skxList, transAnimObj.scxList, transAnimObj.scyList);
								var hasTranslateAnim = this.hasDifferent(transAnimObj.xList, transAnimObj.yList);
								if(!hasTransformAnim && hasTranslateAnim){
									for(var m=0; m<transAnimObj.xList.length; m++){
										var point = matrix.transformPoint(transAnimObj.transXList[m], transAnimObj.transYList[m], false);
										transAnimObj.xList[m] = this.precision(transAnimObj.xList[m] + point.x);
										transAnimObj.yList[m] = this.precision(transAnimObj.yList[m] + point.y);
										transAnimObj.transXList[m] = 0;
										transAnimObj.transYList[m] = 0;
									}
								}

								this._checkTimeValid(timeDur, transAnimObj.timeList, [transAnimObj.splineList, transAnimObj.xList, transAnimObj.yList, transAnimObj.rotList, transAnimObj.trxList, transAnimObj.tryList, transAnimObj.skxList, transAnimObj.skyList, transAnimObj.scxList, transAnimObj.scyList, transAnimObj.transXList, transAnimObj.transYList,
																				transAnimObj.alphaMList, transAnimObj.redOList, transAnimObj.redMList, transAnimObj.greenOList, transAnimObj.greenMList, transAnimObj.blueOList, transAnimObj.blueMList, transAnimObj.alphaOList])
								
								if(combineSkewScales){
									this._checkTimeValid(timeDur, transAnimObj.skxTimeList, [transAnimObj.skxSplineList, transAnimObj.skyScaleXList, transAnimObj.skxScaleYList]);
								}else{
									this._checkTimeValid(timeDur, transAnimObj.skxTimeList, [transAnimObj.skxSplineList, transAnimObj.skxScaleXList, transAnimObj.skxScaleYList]);
									this._checkTimeValid(timeDur, transAnimObj.skyTimeList, [transAnimObj.skySplineList, transAnimObj.skyScaleXList, transAnimObj.skyScaleYList]);
								}

								if(hasTransformAnim || hasTranslateAnim){
									frameHasAnimated = true;
									// the ordering of these animation nodes is important
									this._addAnimationNodes(settings.beginAnimation, settings.beginOffset, elementXML, "translate", [transAnimObj.xList, transAnimObj.yList], transAnimObj.timeList, timeDur, timePrecision, transAnimObj.splineList, null, settings.repeatCount, forceDiscrete);
									this._addAnimationNodes(settings.beginAnimation, settings.beginOffset, elementXML, "rotate", [transAnimObj.rotList, transAnimObj.trxList, transAnimObj.tryList], transAnimObj.timeList, timeDur, timePrecision, transAnimObj.splineList, null, settings.repeatCount, forceDiscrete, false);
									this._addAnimationNodes(settings.beginAnimation, settings.beginOffset, elementXML, "skewX", [transAnimObj.skxList], transAnimObj.timeList, timeDur, timePrecision, transAnimObj.splineList, null, settings.repeatCount, forceDiscrete);
									this._addAnimationNodes(settings.beginAnimation, settings.beginOffset, elementXML, "skewY", [transAnimObj.skyList], transAnimObj.timeList, timeDur, timePrecision, transAnimObj.splineList, null, settings.repeatCount, forceDiscrete);
									this._addAnimationNodes(settings.beginAnimation, settings.beginOffset, elementXML, "scale", [transAnimObj.scxList, transAnimObj.scyList], transAnimObj.timeList, timeDur, timePrecision, transAnimObj.splineList, 1, settings.repeatCount, forceDiscrete, true);
									if(!forceDiscrete){
										if(combineSkewScales){
											this._addAnimationNodes(settings.beginAnimation, settings.beginOffset, elementXML, "scale", [transAnimObj.skyScaleXList, transAnimObj.skxScaleYList], transAnimObj.skxTimeList, timeDur, timePrecision, transAnimObj.skxSplineList, 1, settings.repeatCount, forceDiscrete, true);
										}else{
											this._addAnimationNodes(settings.beginAnimation, settings.beginOffset, elementXML, "scale", [transAnimObj.skxScaleXList, transAnimObj.skxScaleYList], transAnimObj.skxTimeList, timeDur, timePrecision, transAnimObj.skxSplineList, 1, settings.repeatCount, forceDiscrete, true);
											this._addAnimationNodes(settings.beginAnimation, settings.beginOffset, elementXML, "scale", [transAnimObj.skyScaleXList, transAnimObj.skyScaleYList], transAnimObj.skyTimeList, timeDur, timePrecision, transAnimObj.skySplineList, 1, settings.repeatCount, forceDiscrete, true);
										}
									}
									this._addAnimationNodes(settings.beginAnimation, settings.beginOffset, elementXML, "translate", [transAnimObj.transXList, transAnimObj.transYList], transAnimObj.timeList, timeDur, timePrecision, transAnimObj.splineList, null, settings.repeatCount, forceDiscrete);
								}
								
								var hasOpacityAnim = this.hasDifferent(transAnimObj.alphaMList);
								var hasColorAnim = this.hasDifferent(transAnimObj.redOList, transAnimObj.redMList, transAnimObj.greenOList, transAnimObj.greenMList, transAnimObj.blueOList, transAnimObj.blueMList, transAnimObj.alphaOList);
								if((hasOpacityAnim || hasColorAnim) && !isMask){
									frameHasAnimated = true;
									if(hasColorAnim){
										this._addAnimationNodes(settings.beginAnimation, settings.beginOffset, transAnimObj.colorTransNode.feFuncR, "intercept", [transAnimObj.redOList], transAnimObj.timeList, timeDur, timePrecision, transAnimObj.splineList, 0, settings.repeatCount, forceDiscrete);
										this._addAnimationNodes(settings.beginAnimation, settings.beginOffset, transAnimObj.colorTransNode.feFuncR, "slope", [transAnimObj.redMList], transAnimObj.timeList, timeDur, timePrecision, transAnimObj.splineList, 1, settings.repeatCount, forceDiscrete);
										this._addAnimationNodes(settings.beginAnimation, settings.beginOffset, transAnimObj.colorTransNode.feFuncG, "intercept", [transAnimObj.greenOList], transAnimObj.timeList, timeDur, timePrecision, transAnimObj.splineList, 0, settings.repeatCount, forceDiscrete);
										this._addAnimationNodes(settings.beginAnimation, settings.beginOffset, transAnimObj.colorTransNode.feFuncG, "slope", [transAnimObj.greenMList], transAnimObj.timeList, timeDur, timePrecision, transAnimObj.splineList, 1, settings.repeatCount, forceDiscrete);
										this._addAnimationNodes(settings.beginAnimation, settings.beginOffset, transAnimObj.colorTransNode.feFuncB, "intercept", [transAnimObj.blueOList], transAnimObj.timeList, timeDur, timePrecision, transAnimObj.splineList, 0, settings.repeatCount, forceDiscrete);
										this._addAnimationNodes(settings.beginAnimation, settings.beginOffset, transAnimObj.colorTransNode.feFuncB, "slope", [transAnimObj.blueMList], transAnimObj.timeList, timeDur, timePrecision, transAnimObj.splineList, 1, settings.repeatCount, forceDiscrete);
										this._addAnimationNodes(settings.beginAnimation, settings.beginOffset, transAnimObj.colorTransNode.feFuncA, "intercept", [transAnimObj.alphaOList], transAnimObj.timeList, timeDur, timePrecision, transAnimObj.splineList, 0, settings.repeatCount, forceDiscrete);
										this._addAnimationNodes(settings.beginAnimation, settings.beginOffset, transAnimObj.colorTransNode.feFuncA, "slope", [transAnimObj.alphaMList], transAnimObj.timeList, timeDur, timePrecision, transAnimObj.splineList, 1, settings.repeatCount, forceDiscrete);

									}else if(hasOpacityAnim && this._addAnimationNodes(settings.beginAnimation, settings.beginOffset, elementXML, "opacity", [transAnimObj.alphaMList], transAnimObj.timeList, timeDur, timePrecision, transAnimObj.splineList, 1, settings.repeatCount, forceDiscrete)){
										if(this.showEndFrame)elementXML.@opacity = lastElement.colorAlphaPercent / 100;
										transAnimObj.colorTransNode.feFuncA.@slope = 1;
									}
								}
								this._simplifyColorTrans(transAnimObj.colorTransNode, elementXML);

								elementXML.@transform = this._getMatrix(matrix);

								if(ext.log){
									ext.log.pauseTimer(timer2);
								}
							}

							var lastFrameInd = (transToDiff ? frameEnd-1 : frameEnd);
							if(settings.loopTweens && lastFrameInd > (animDur - settings.animOffset + settings.startFrame))lastFrameInd = (animDur - settings.animOffset + settings.startFrame); // really just to suppress the warning

							var frameTimeStart = this.precision((settings.animOffset + n - settings.startFrame)/animDur);
							var frameTimeEnd = this.precision((settings.animOffset + lastFrameInd - settings.startFrame)/animDur);

							if(frameTimeStart>1)fl.trace("START TIME WARNING: "+frameTimeStart+" "+settings.animOffset+" "+animDur+" "+n+" "+settings.startFrame+" "+((n - settings.startFrame)*(1/ext.doc.frameRate)));
							if(frameTimeEnd>1)fl.trace("END TIME WARNING: "+timeline.name+" "+(settings.animOffset + lastFrameInd - settings.startFrame)+" / "+animDur+" = "+frameTimeEnd+" "+frameTimeStart);


							if(frameTimeEnd>1)frameTimeEnd = 1;

							if(items.length>0 && (frameTimeStart!=0 || frameTimeEnd!=1)){ // don't bother if element is always there
								var fAnimNode = animNode.copy();
								if(frameTimeStart==0){
									fAnimNode.@keyTimes = frameTimeStart+";"+frameTimeEnd+";1";
									fAnimNode.@values="inline;none;none";

									if(!this.showStartFrame){
										frameXML.@style = "display:none;";
									}
								}else{
									if(frameTimeEnd==1){
										fAnimNode.@keyTimes = "0;"+frameTimeStart+";"+frameTimeEnd;
										fAnimNode.@values="none;inline;none";

										if(!this.showEndFrame){
											frameXML.@style = "display:none;";
										}
									}else{
										fAnimNode.@keyTimes = "0;"+frameTimeStart+";"+frameTimeEnd+";1";
										fAnimNode.@values="none;inline;none;none";

										frameXML.@style = "display:none;";
									}
								}
								frameXML.appendChild(fAnimNode);
							}
						}

						/*
						 * Masked layers are grouped together and inserted after
						 * the mask.
						 */
						if(isMasked){  // 
							masked.unshift(frameXML);
						}else{
							xml.prependChild(frameXML);
						}
						if(!frameHasAnimated && (n!=0 || frameEnd!=layer.frameCount)){
							frameCacheList.push(frameXML);
						}

						n = transToDiff ? frameEnd-1 : frameEnd;
					}
					if(layer.visible!=lVisible) layer.visible=lVisible;
					if(layer.locked!=lLocked) layer.locked=lLocked;

					if(frameCacheList.length > 1){
						this._layerCacheLists.push(frameCacheList);
					}
				}
				if(masked.length){
					// masked layers have ended group
					this._doMask(xml, masked, maskId);
				}
			}else{
				/*var vb=String(xml['@viewBox']).split(' ');
				instanceXML['@width']=vb[2];
				instanceXML['@height']=vb[3];
				instanceXML['@x']=vb[0];
				instanceXML['@y']=vb[1];*/
				//instanceXML['@overflow']="visible";
				this._useNodeMap[id].push(instanceXML);
			}
			/*
			 *  If this is a temporary scene, delete it and return to the original.
			 */
			/*if(originalScene!=undefined){
				var timelines=ext.timelines;
				ext.doc.deleteScene();
				for(i=0;i<ext.timelines.length;i++){
					if(timelines[i].name==originalScene){
						ext.doc.editScene(i);
						break;	
					}
				}
			}
			if(tempName!=undefined){
				if(ext.lib.itemExists(tempName)){
					ext.lib.deleteItem(tempName);	
				}
			}*/
						
			if(isNew){ // set the viewBox
				if(settings.isRoot && this.clipToScalingGrid && settings.libraryItem){
					boundingBox=settings.libraryItem.scalingGridRect;
				}
				if(!settings.isRoot){
					dom.defs.appendChild(xml);
				}
			}
			/*var viewBox=(
				String(this.precision(boundingBox.left))+' '+
				String(this.precision(boundingBox.top))+' '+
				String(this.precision(boundingBox.right-boundingBox.left))+' '+
				String(this.precision(boundingBox.bottom-boundingBox.top))
			);
			if(isNew){
				xml['@viewBox'] = viewBox;
			}else if(xml['@viewBox']!=viewBox){
				instanceXML['@viewBox'] = viewBox;
			}*/
			var trans = this._getMatrix(settings.matrix);
			if(trans==this.IDENTITY_MATRIX)trans = null;

			if(settings.isRoot){
				if(ext.log) ext.log.pauseTimer(timer);
				xml.setName('g');
				
				if(trans) xml['@transform'] = trans;
				delete xml['@xlink-href'];
				return xml;
			}else{
				// instanceXML['@width']=String(Math.ceil(boundingBox.right-boundingBox.left));
				// instanceXML['@height']=String(Math.ceil(boundingBox.bottom-boundingBox.top));
				// instanceXML['@x']=Math.floor(boundingBox.left);
				// instanceXML['@y']=Math.floor(boundingBox.top);
				/*if(boundingBox.left!=instanceXML['@x'] || boundingBox.top!=instanceXML['@y']){
					// if there are rounding errors we add the dif to the transform (greatly scaled objects can be affected dramatically)
					// var offset = settings.matrix.transformPoint(boundingBox.left-instanceXML['@x'], boundingBox.top-instanceXML['@y'], false);
					// settings.matrix.tx += offset.x;
					// settings.matrix.ty += offset.y;

					// not sure if this is really helping, must test more
				}*/
				if(trans) instanceXML['@transform'] = trans;
				// if(settings.isRoot && settings.libraryItem){
				// 	dom.@viewBox = viewBox;
				// 	dom.@width = instanceXML.@width;
				// 	dom.@height = instanceXML.@height;
				// }

				if(ext.log) ext.log.pauseTimer(timer);
				return { inst : instanceXML, sym : xml };
			}
		},
		hasDifferent:function(){
			for(var i=0; i<arguments.length; i++){
				var list = arguments[i];
				var firstVal;
				for(var x=0; x<list.length; x++){
					if(x==0){
						firstVal = list[x];
					}else if(firstVal != list[x]){
						return true;
					}
				}
			}
			return false;
		},
		_timelineCopies:null,
		_getTimelineCopy:function(libraryItem, timeline, startFrame, endFrame){
			var key = (libraryItem==undefined ? ext.doc.timelines.indexOf(timeline.$) : libraryItem.name);
			var list = this._timelineCopies[key];
			if(!list){
				list = [];
				this._timelineCopies[key] = list;
			}else{
				for(var i=0; i<list.length; ++i){
					var pack = list[i];
					var collides = false;
					for(var j=0; j<pack.ranges.length; j++){
						var range = pack.ranges[j];
						if(!(range[0]>endFrame || range[1]<startFrame)){
							collides = true;
							break;
						}
					}
					if(!collides){
						pack.ranges.push([startFrame, endFrame]);
						return pack.clone;
					}
				}
			}

			if(libraryItem==undefined){
				ext.doc.editScene(ext.doc.timelines.indexOf(timeline.$));
				ext.doc.duplicateScene();
				timelines=ext.doc.timelines;
				timeline = new ext.Timeline(timelines[ext.doc.timelines.indexOf(timeline.$)+1]);
			}else{
				var tempName = ext.lib.uniqueName(this._tempFolder+'/'+libraryItem.name);
				if(!ext.lib.itemExists(tempName.dir)){
					ext.lib.addNewItem('folder',tempName.dir);
				}
				ext.lib.selectItem(libraryItem.name);

				if(ext.lib.duplicateItem()){
					ext.lib.moveToFolder(tempName.dir);
					ext.lib.renameItem(tempName.basename);

					timeline = new ext.Timeline(ext.lib.getSelectedItems()[0].timeline);
				}else{
					fl.trace("Error: Couldn't copy item "+libraryItem.name);
				}
			}
			if(timeline){
				list.push({clone:timeline, ranges:[[startFrame, endFrame]]});
			}
			return timeline;
		},
		_getRotation:function(element, allowSkewRotate){
			if((isNaN(element.rotation) || element.rotation==0) && allowSkewRotate){
				//fl.trace("--------------- TAKE SKEW");
				return element.skewX;
			}else if(!isNaN(element.rotation)){
				return element.rotation;
			}else{
				return 0;
			}
		},
		_addAnimFrame:function(frame, element, invMatrix, time, startTime, forceDiscrete,
								rot, skewX, skewY, autoRotate,
								transAnimObj, timeline, layerI){

			if(!isNaN(element.rotation)){
				element.rotation += 0; // sometimes fixes invalid matrices
			}
			var matrix = new ext.Matrix(element.matrix);
			var transPoint = element.getTransformationPoint();

			transAnimObj.transXList.push(-transPoint.x);
			transAnimObj.transYList.push(-transPoint.y);

			//transPoint = matrix.transformPoint(transPoint.x, transPoint.y, false);
			var outerTransPoint = matrix.transformPoint(transPoint.x, transPoint.y, true);
			transAnimObj.xList.push(this.precision(outerTransPoint.x));
			transAnimObj.yList.push(this.precision(outerTransPoint.y));

			if(!isNaN(rot) && rot!=0){
				var rotRad = rot / 180 * Math.PI;

				// Removed the two following conditions for #3924
				/*if(isNaN(element.rotation)){
					var spin = Math.abs(element.skewY - element.skewX);
					if((spin > 90 && spin < 270) || (spin < -90 && spin > -270)){
					//if(spin > 180){
						rot = -rot;

						//transPoint.x = -transPoint.x;
						//transPoint.y = -transPoint.y;
					}
				}*/

				var rotCos = Math.cos(rotRad);
				var rotSin = Math.sin(rotRad);
				matrix = this.rotateMatrix(matrix, rot, rotSin, rotCos, transPoint);
				matrix = new ext.Matrix(fl.Math.concatMatrix(matrix, invMatrix));
				//if((matrix.a<0) == (matrix.d<0)){
					transAnimObj.rotList.push(this.precision(rot + autoRotate));
				/*}else{
					transAnimObj.rotList.push(this.precision(-rot + autoRotate));
					matrix.a = -matrix.a;
					matrix.d = -matrix.d;
				}*/
			}else{
				transAnimObj.rotList.push(0);
				var rotCos = Math.cos(0);
				var rotSin = Math.sin(0);
				matrix = new ext.Matrix(fl.Math.concatMatrix(matrix, invMatrix));
			}

			transAnimObj.trxList.push(0);
			transAnimObj.tryList.push(0);

			if(forceDiscrete){
				var radX = skewX / 180 * Math.PI;
				var radY = skewY / 180 * Math.PI;
				transAnimObj.scxList.push(this.precision(element.scaleX * Math.cos(radY)));
				transAnimObj.scyList.push(this.precision(element.scaleY * Math.cos(radX)));

			}else{
				transAnimObj.scxList.push(this.precision(element.scaleX));
				transAnimObj.scyList.push(this.precision(element.scaleY));
			}
			transAnimObj.skxList.push(this.precision(skewX));
			transAnimObj.skyList.push(this.precision(skewY));

			transAnimObj.redOList.push(element.colorRedAmount / 0xff);
			transAnimObj.redMList.push(element.colorRedPercent / 100);
			transAnimObj.greenOList.push(element.colorGreenAmount / 0xff);
			transAnimObj.greenMList.push(element.colorGreenPercent / 100);
			transAnimObj.blueOList.push(element.colorBlueAmount / 0xff);
			transAnimObj.blueMList.push(element.colorBluePercent / 100);
			transAnimObj.alphaOList.push(element.colorAlphaAmount / 0xff);
			transAnimObj.alphaMList.push(element.colorAlphaPercent / 100);

			var spline = this._getFrameSpline(frame, timeline, layerI);
			transAnimObj.splineList.push(spline);

			transAnimObj.timeList.push(time - startTime);
		},
		rotateMatrix:function(matrix, angle, rotSin, rotCos, transPoint){
			var radians = angle / 180 * Math.PI;
			var rotMatrix = new ext.Matrix();
			rotMatrix.a = Math.cos(radians);
			rotMatrix.b = Math.sin(radians);
			rotMatrix.c = -Math.sin(radians);
			rotMatrix.d = Math.cos(radians);
			var ret = new ext.Matrix(fl.Math.concatMatrix(matrix, rotMatrix.invert()));
			ret.tx = matrix.tx + (transPoint.x * rotCos + transPoint.y * -rotSin) - transPoint.x;
			ret.ty = matrix.ty + (transPoint.y * rotCos + transPoint.x * rotSin) - transPoint.y;
			return ret;
		},
		checkSkewQuadrant:function(skew, time, oldSkew, oldTime, scaleList, othScaleList, scaleTimeList, scaleSplineList, transPointDim1, transPointDim2, doEase){
			var quad = Math.floor((skew) / 90);
			var oldQuad = Math.floor((oldSkew) / 90);

			if(oldSkew!=null && doEase){
				//skew = this._getClosestRot(skew, oldSkew);
				var diff = quad - oldQuad;
				if(diff){
					var startsOnQuad = (oldSkew % 90) == 0;
					var endsOnQuad = (skew % 90) == 0;
					var dir = diff > 0 ? 1 : -1;
					if(dir==-1)diff = -diff;
					if(skew % 90 == 0 || startsOnQuad) diff--;

					var startTime = oldTime;
					var endTime = time;
					var timePerDegs = (time - oldTime) / (skew - oldSkew);
					if(!startsOnQuad){
						var fract = oldSkew / 90;
						while(fract<0)fract += 1;
						fract = fract%1;
						if(dir==-1) fract = (1 - fract);

						var extra = fract * 90;
						startTime += extra * timePerDegs;
					}
					if(!endsOnQuad){
						var fract = skew / 90;
						while(fract<0)fract += 1;
						fract = fract%1;
						if(dir==1) fract = (1 - fract);

						var extra = fract * 90;
						endTime -= extra * timePerDegs;
					}
					
					var timeDiff = endTime - startTime;
					var timeInc = timeDiff / (diff + 1);


					var q = oldQuad;

					if(dir==-1 && !startsOnQuad)q++;
					for(var i=0; i<diff; i++){
						q += dir;
						q = q%4;

						var t = this.precision(startTime + timeInc * (i+1));
						if(i==diff-1){
							if(skew < 0){
								fract = ((-skew)%90) / 90;
							}else{
								fract = (skew%90) / 90;
							}
							if(!fract)fract = 1;
							if(dir<0)fract = 1-fract;
						}else{
							fract = 1;
						}
						//var sk;
						var sc;
						var ease;
						while(q<0) q += 4;
						//var rads = q * Math.PI / 2;
						switch(q){
							case 0:
								//sk = 0;
								sc = 1;
								ease = -1;
								break;
							case 1:
								//sk = 90 * dir;
								sc = 0;
								ease = 1;
								break;
							case 2:
								//sk = 0;
								sc = -1;
								ease = -1;
								break;
							case 3:
								//sk = -90 * dir;
								sc = 0;
								ease = 1;
								break;
						}
						scaleList.push(sc);
						othScaleList.push(1);
						scaleTimeList.push(t);
						if(scaleList.length>1)scaleSplineList.push(this._getFractSpline(ease));
					}
				}
			}
			var rads = skew / 180 * Math.PI;
			scaleList.push(this.precision(Math.cos(rads)));
			othScaleList.push(1);
			scaleTimeList.push(this.precision(time));
			if(scaleList.length>1)scaleSplineList.push(doEase ? this._getFractSpline(0) : this.NO_TWEEN_SPLINE_TOKEN);

			return diff>0;
		},
		_addTimeValue:function(fromIndex, toIndex, time, timeList, valueLists){
			timeList.splice(toIndex, 0, time);
			for(var j=0; j<valueLists.length; ++j){
				var list = valueLists[j];
				list.splice(toIndex, 0, list[fromIndex]);
			}
		},
		_checkTimeValid:function(totalTime, timeList, valueLists){
			if(timeList[0] > 0){
				// add value at time=0 if it doesn't exist
				this._addTimeValue(0, 0, 0, timeList, valueLists);
			}
			if(timeList[timeList.length-1] < totalTime){
				// add value at time=1 if it doesn't exist
				this._addTimeValue(timeList.length-1, timeList.length, totalTime, timeList, valueLists);
			}
		},
		_getClosestRotList:function(rot, rotList){
			if(rotList.length==0){
				return rot;
			}else{
				var prev = rotList[rotList.length-1];
				return this._getClosestRot(rot, prev);
			}
		},
		_getClosestRot:function(rot1, rot2){
			var forward = rot1+360;
			var dif = Math.abs(rot1 - rot2);
			var backward;
			if(Math.abs(forward - rot2)<dif){
				return forward;
			}else if(Math.abs((backward = (rot1-360)) - rot2)<dif){
				return backward;
			}else{
				return rot1;
			}
		},
		_getPriorFrame:function(timeline, frame){
			if(timeline.$)timeline = timeline.$;
			// check whether we can use a previous frame
			var failed = false;
			var lastPrior = -1;
			var layers = timeline.layers;
			if(frame>timeline.frameCount-1)frame = timeline.frameCount-1;

			for(var i=0; i<layers.length && !failed; i++){
				var layer=layers[i];
				if(layer.layerType=='guide')continue;

				var thisFrame = layer.frames[frame];
				if(thisFrame){
					if(thisFrame.tweenType=="motion"){
						failed = true;
						break;
					}
					for(var j=0; j<thisFrame.elements.length; j++){
						var element = thisFrame.elements[j];
						/*if(element.symbolType=="graphic" && element.loop!="single frame" && element.libraryItem.timeline.frameCount>1){
							failed = true;
							break;
						}*/
						if(element.symbolType=="graphic" && element.loop!="single frame" && element.libraryItem.timeline.frameCount>1){
							var priorFrame = this._getPriorFrame(element.libraryItem.timeline, element.firstFrame + (frame - thisFrame.startFrame));
							var dif = priorFrame - element.firstFrame;
							if(thisFrame.startFrame + dif>lastPrior){
								lastPrior = thisFrame.startFrame + dif;
							}
						}
					}
					if(thisFrame.startFrame>lastPrior){
						lastPrior = thisFrame.startFrame;
					}
				}else if(layer.frames.length>lastPrior){
					lastPrior = layer.frames.length;
				}
			}
			if(!failed && lastPrior!=-1){
				return lastPrior;
			}else{
				return frame;
			}
		},
		_getRotHemisphere:function(rot){
			return Math.floor((rot+90)/180);
		},
		_normaliseDegrees:function(deg){
			deg = deg%360;
			while(deg<0)deg += 360;
			return deg;
		},
		_doMask:function(xml, masked, maskId){
			var mg = <g mask={"url(#"+maskId+")"}/>;
			for(var m=0;m<masked.length;m++){
				mg.appendChild(masked[m]);
			}
			xml.prependChild(mg);
			masked.clear();
		},
		_addAnimationNodes:function(beginAnimation, beginOffset, toNode, type, valueLists, times, totalTime, timePrecision, splineList, defaultValue, repeatCount, forceDiscrete, validateAllLists){
			var values = new Array();

			var getValue = function(i){
				var ret = valueLists[0][i].toString();
				for(var j=1; j<valueLists.length; ++j){
					ret += ","+valueLists[j][i];
				}
				return ret;
			}
			for(var i=0; i<times.length; ++i){
				values[i] = getValue(i);
			}

			/*if(times.length==2){
				if(values[0]==values[1])times[1] = 0.5; // reduces unneeded decimal points if all points are the same
				this._addTimeValue(times.length-1, times.length, totalTime, times, valueLists.concat([values, splineList])); // add additional keyframe if only two exist
			}*/
			var doReplace = toNode.animateTransform.length()==0;

			var count = times.length + (times[times.length-1] < totalTime ? 1 : 0);
			var lastEndTime = 0;
			var lastTakenTo = 0;
			var ret = false;
			while(lastTakenTo < times.length-1){
				var takenTo = this._addAnimationNode(lastTakenTo, beginAnimation, beginOffset, lastEndTime, toNode, type, values, valueLists, times, timePrecision, splineList, defaultValue, repeatCount, forceDiscrete, validateAllLists, doReplace);
				if(takenTo===false){
					lastTakenTo += 31;
				}else{
					if(takenTo){
						ret = true;
					}
					lastTakenTo = takenTo; // minus one so that animations overlap by one keyframe
					if(doReplace && lastTakenTo < times.length-1){
						// when multiple animateTransform nodes are atacked, sometimes the "replace" logic gets applied in the wrong order, this prevents that.
						doReplace = false;
						var nodes = toNode.animateTransform;
						for(var i=0; i<nodes.length(); i++){
							nodes[i].@additive = "sum";
						}
						if(beginAnimation=="0s"){
							beginAnim = (beginOffset ? beginOffset + "s": "0s");
						}else{
							beginAnim = beginAnimation + (beginOffset ? "+" + beginOffset + "s" : "");
						}
						var animNode = new XML('<animateTransform attributeName="transform" additive="replace" type="translate" dur="'+totalTime+'s" keyTimes="0;1" values="0;0"/>')
						if(beginAnim!="0s")animNode.@begin = beginAnim;
						toNode.prependChild(animNode);
					}
				}
				lastEndTime = times[lastTakenTo];
			}
			return ret;
		},
		_addAnimationNode:function(offset, beginAnimation, beginOffset, startTime, toNode, type, values, valueLists, times, timePrecision, splineList, defaultValue, repeatCount, forceDiscrete, validateAllLists, doReplace){
			var beginAnim;
			beginOffset = this.precision(beginOffset + startTime);
			if(beginAnimation=="0s"){
				beginAnim = (beginOffset ? beginOffset + "s": "0s");
			}else{
				beginAnim = beginAnimation + (beginOffset ? "+" + beginOffset + "s" : "");
			}

			if(validateAllLists==null)validateAllLists = true;
			if(defaultValue==null)defaultValue = 0;
			var found = false;
			var n = (validateAllLists ? valueLists.length : 1);
			for(var i=0; i<n; ++i){
				var list = valueLists[i];
				var firstVal = list[offset];
				for(var j=offset; j<list.length && j<offset+32; ++j){
					var val = list[j];
					if(val!=defaultValue){
						found = true;
						break;
					}
				}
				if(found)break;
			}
			if(!found){
				return false;
			}
			var n = splineList.length;
			if(n > offset+32) n = offset+32;
			var hasTweens = false;
			var hasEasing = false;
			for(var i=offset; i<n; ++i){
				if(splineList[i]!=this.NO_TWEEN_SPLINE_TOKEN){
					hasTweens = true;
					if(splineList[i]!=this.LINEAR_SPLINE){
						hasEasing = true;
						break;
					}
				}
			}
			/*while(times.length>splineList.length){
				// we use this so that scale values can use the short spline list (improves easing)
				splineList.push(splineList[offset]);
			}*/

			var lastVal = values[offset];
			var lastTime = times[offset];//this.precision((times[offset]-startTime)/totalTime, timePrecision);
			var lastSpline = splineList[offset];
			var secVal = values[offset+1];

			// if(lastTime<=0 || (secVal==lastVal && lastSpline==this.NO_TWEEN_SPLINE_TOKEN)){
				var validV = [lastVal];
				var validT = [lastTime];
				var validS = [lastSpline==this.NO_TWEEN_SPLINE_TOKEN ? this.NO_TWEEN_SPLINE : lastSpline];
			// }else{
			// 	var validV = [lastVal,lastVal];
			// 	var validT = [0,lastTime];
			// 	var validS = [this.LINEAR_SPLINE, lastSpline==this.NO_TWEEN_SPLINE_TOKEN ? this.NO_TWEEN_SPLINE : lastSpline];
			// }


			var endPointMode = false;
			n = times.length;
			var takenTo = offset;
			for(var i=offset + 1; i<n && validT.length<32; ++i){
				lastTime = times[i];//this.precision((times[i]-startTime)/totalTime, timePrecision);
				var newVal = values[i];
				var newSpline = splineList[i];

				if(lastSpline==this.NO_TWEEN_SPLINE_TOKEN){
					if(validT.length==31){
						lastTime = times[i-1];
						n--; // no room to add a tween killer
						break;
					}
					if(lastVal==validV[validV.length-2]){
						validT[validT.length-1] = lastTime - 1/Math.pow(10, this.decimalPointPrecision);
						validS[validS.length-1] = this.NO_TWEEN_SPLINE;
					}else{
						validV.push(lastVal);
						validT.push(lastTime - 1/Math.pow(10, this.decimalPointPrecision));
						validS.push(this.NO_TWEEN_SPLINE);
					}
				}

				if(newVal==lastVal && (endPointMode || (validV.length>1 && lastVal==validV[validV.length-2]))){
					validT[validT.length-1] = lastTime;
					validS[validS.length-1] = (newSpline==this.NO_TWEEN_SPLINE_TOKEN ? this.NO_TWEEN_SPLINE : newSpline);

				}else{

					endPointMode = (newVal==lastVal);
					lastVal = newVal;
					validV.push(newVal);
					validT.push(lastTime);
					validS.push(newSpline==this.NO_TWEEN_SPLINE_TOKEN ? this.NO_TWEEN_SPLINE : newSpline);
				}
				takenTo++;

				lastSpline = newSpline;
			}
			var endTime = lastTime;
			var totalTime = endTime - startTime;
			var lastTime;
			for(var i=0; i<validT.length; i++){
				var time = validT[i];
				time = this.precision((time-startTime)/totalTime, timePrecision);
				if(lastTime == time){
					if(i==validT.length-1){
						validT[i-1] -= 1/Math.pow(10, timePrecision);
					}else{
						time += 1/Math.pow(10, timePrecision);
					}
				}
				validT[i] = time;
				lastTime = time;
			}
			/*if(validT[validT.length-1]<1){
				if(validV.length==2 && validV[0]==validV[1]){
					validT[1] = 0.5; // reduces unneeded decimal points
				}
				validV.push(lastVal);
				validT.push(1);
			}else{
				validS.pop(); // spline list should be one element shorter than other lists
			}*/

			validS.pop(); // spline list should be one element shorter than other lists

			var isTrans = (type=="scale" || type=="translate" || type=="rotate" || type=="skewX" || type=="skewY");
			if(!isTrans){
				var animNode = <animate />;
				animNode.@attributeName = type;
			}else{
				var animNode = <animateTransform
						      attributeName="transform" additive="sum" />;
				animNode.@type = type;
				if(doReplace)animNode.@additive = "replace";
			}


			if(beginAnim!="0s")animNode.@begin = beginAnim;
			if(repeatCount!=1){
				if(repeatCount.charAt(repeatCount.length-1)=="s"){
					animNode.@repeatDur = repeatCount;
				}else{
					animNode.@repeatCount = repeatCount;
				}
			}

			animNode.@dur = this.precision(totalTime)+"s";
			animNode.@keyTimes = validT.join(";");
			animNode.@values = validV.join(";");

			if(hasTweens && !forceDiscrete){
				if(hasEasing){
					animNode.@keySplines = validS.join(";");
					animNode.@calcMode="spline";
				}
			}else{
				animNode.@calcMode="discrete";
			}

			toNode.appendChild(animNode);
			return takenTo;
		},
		/**
		 * Gets the spline points for a motion tweened frame.
		 * Spline data is in the format 'x1 y1 x2 y2;' (per frame)
		 */
		_getFrameSpline:function(frame, timeline, layerI){

			// Tween support warnings, remove these as different tween settings gain support
			if(frame.hasCustomEase){
				var ease = frame.getCustomEase();

				if(ease.length==4){
					var p1 = ease[1];
					var p2 = ease[2];
					return this.precision(p1.x)+" "+this.precision(p1.y)+" "+this.precision(p2.x)+" "+this.precision(p2.y);
				}else{
					ext.warn('Custom easing is only supported with two control points (in timeline "'+timeline.name+'", layer '+(layerI+1)+' at frame '+(frame.startFrame+1)+")");
				}
			}
			if(!frame.useSingleEaseCurve) ext.warn('Per property custom easing is not supported (in timeline "'+timeline.name+'", layer '+(layerI+1)+' at frame '+(frame.startFrame+1)+")");
			
			if(frame.tweenType=="none"){
				return this.NO_TWEEN_SPLINE_TOKEN;
			}
			return this._getFractSpline(frame.tweenEasing/100);
		},
		_getFractSpline:function(fract){
			if(fract==0)return this.LINEAR_SPLINE;

			fract = fract * 0.5; // this number determines the severeness of easing (should match flash IDE, between 0-1)
			var halfFract = fract/2;
			if(fract<0){
				// ease in
				return this._removeLeadingZero(-fract)+' 0 '+this._removeLeadingZero(0.5-halfFract)+' .5';
			}else{
				// ease out
				return this._removeLeadingZero(0.5 - halfFract)+' .5 '+this._removeLeadingZero(1-fract)+' 1';
			}
		},
		_removeLeadingZero:function(num){
			var str = this.precision(num).toString();
			if(str.indexOf("0.")==0)str = str.substr(1);
			return str;
		},
		/**
		 * Retrieves the a list of items, masked by another list if specified
		 */
		_getItemsByFrame:function(frame, maskList){
			if(maskList){
				var ret = [];
				for(var i=0; i<frame.elements.length; i++){
					var element = frame.elements[i];
					if(maskList.indexOf(element)!=-1){
						ret.push(element);
					}
				}
				return ret;
			}else{
				return frame.elements;
			}
		},
		_createViewBoxAnim:function(rootNode, beginAnimation, timeline, layer, frame, frameInd, viewBox, startFrame, endFrame, timeDur, timePrecision, repeatCount){
			var defValue = this.x+" "+this.y+" "+this.width+" "+this.height;
			var values = [];
			var times = [];
			var splines = [];
			var hasNoDef = false;
			var viewBoxItem = viewBox.libraryItem;
			var viewBoxBounds = {left:0, width:0, top:0, height:0};
			// This is required because left/top props are horribly unreliable on animated elements
			for(var i=0; i<viewBoxItem.timeline.layers.length; i++){
				var tLayer = viewBoxItem.timeline.layers[i];
				var tItems = tLayer.frames[0].elements;
				for(var j=0; j<tItems.length; j++){
					var tItem = tItems[j];
					if(tItem.left < viewBoxBounds.left)viewBoxBounds.left = tItem.left;
					if(tItem.width > viewBoxBounds.width)viewBoxBounds.width = tItem.width;
					if(tItem.top < viewBoxBounds.top)viewBoxBounds.top = tItem.top;
					if(tItem.height > viewBoxBounds.height)viewBoxBounds.height = tItem.height;
				}
			}

			var end = (endFrame < layer.frameCount ? endFrame : layer.frameCount);
			while( frameInd < end ){
				var mat = new ext.Matrix(viewBox.matrix);
				var orig = mat.transformPoint(viewBoxBounds.left, viewBoxBounds.top, true);
				var size = mat.transformPoint(viewBoxBounds.width, viewBoxBounds.height, false);
				var val = this.precision(orig.x)+" "+this.precision(orig.y)+" "+this.precision(size.x)+" "+this.precision(size.y);
				values.push(val);
				times.push((frameInd - startFrame) / ext.doc.frameRate);

				var spline = this._getFrameSpline(frame, timeline, frameInd);
				splines.push(spline);
				if(val!=defValue)hasNoDef = true;

				frameInd += frame.duration;
				if(frameInd >= end)break;

				frame = layer.frames[frameInd];
				if(frame.elements.length!=1 || frame.elements[0].libraryItem!=viewBoxItem){
					frameInd--;
					break;
				}else{
					timeline.currentFrame = frameInd;
					viewBox = frame.elements[0];
				}
			}
			if(hasNoDef){
				this._addAnimationNodes(beginAnimation, 0, rootNode, "viewBox", [values], times, timeDur, timePrecision, splines, null, repeatCount, false);
			}

			return frameInd;
		},
		/**
		 * Retrieves the svg data for a symbol instance.
		 * @parameter {extensible.SymbolInstance} instance
		 * @parameter {Object} options
		 * @private
		 */
		_getSymbolInstance:function(instance, options){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG._getSymbolInstance()');	
			}
			var timeline=instance.timeline;
			var settings=new ext.Object({
				startFrame:0,
				frameCount: timeline.frames.length,
				matrix: new ext.Matrix(),
				colorTransform: null,
				libraryItem:instance.libraryItem,
				referenceShapes:instance.symbolType=="graphic"
			});
			settings.extend(options);
			//ext.message("_getSymbolInstance: "+instance.libraryItem.name+" - loop:"+instance.loop+" frameCount:"+settings.frameCount+" startFrame:"+settings.startFrame);
			var dom = settings.dom;
			//settings.matrix = instance.matrix.concat(settings.matrix);
			settings.matrix = fl.Math.concatMatrix(instance.matrix, settings.matrix);

			var pack = this._getTimeline(instance.timeline, settings);
			var xml = pack.inst;
			var sym = pack.sym;
			/*var filterID=this._getFilters(instance, xml, options, dom.defs);
			if(filterID && dom.defs.filter.(@id.toString()==filterID).length()){
				xml['@filter']='url(#'+filterID+')';
			}*/

			if(ext.log){
				ext.log.pauseTimer(timer);
			}
			return xml;
		},
		_getFilters:function(element, xml, options, defs, transAnimObj){
			var settings=new ext.Object({
				frame:0,
				color:undefined,
				boundingBox:undefined
			});
			settings.extend(options);
			var filterID,filter;
			var filters=(
				element?
				element.getFilters().filter(
					function(element,index,array){
						return element.enabled;
					}
				):[]
			);
			var color=(
				settings.color ?
				new ext.Color(settings.color) : (
					element?
					new ext.Color(element):
					undefined
				)
			);
			if(
				(
					color &&
					( !color.amount.is([0,0,0,0]) || !color.percent.is([100,100,100,100]) )
				) || filters.length || transAnimObj
			){
				var src="SourceGraphic";
				filterID=this._uniqueID('filter');
				filter=new XML('<filter id="'+filterID+'" />');			
				var boundingBox=(
					settings.boundingBox ||
					(
						element?
						element.objectSpaceBounds:
						null
					)
				);
				if(
					element &&
					!boundingBox && 
					element.getObjectSpaceBounds
				){
					boundingBox=element.getObjectSpaceBounds({
						includeGuides:this.includeGuides,
						includeHiddenLayers:this.includeHiddenLayers,
						frame:(
							element.getCurrentFrame?
							element.getCurrentFrame(settings.frame):
							settings.frame
						)
					});
				}
				var leftMargin,rightMargin,topMargin,bottomMargin;
				leftMargin=rightMargin=topMargin=bottomMargin=0;
				var filterCount={
					adjustColorFilter:0,
					bevelFilter:0,
					blurFilter:0,
					dropShadowFilter:0,
					glowFilter:0,
					gradientBevelFilter:0,
					gradientGlowFilter:0,
				};
				var adj={r:0.2125,g:0.7154,b:0.0721};
				var adjEq={r:.33333,b:.33333,g:.33333};
				var adjInv={r:0.7875,g:0.2846,b:0.9279};
				for(var i=0;i<filters.length;i++){
					var f=filters[i];
					var prefix=(
						f.name.replace(/Filter$/,'')+String(filterCount[f.name])+'_'
					);
					filterCount[f.name]+=1;
					switch(f.name){
						case "adjustColorFilter":
							/*
							 * For contrast & saturation with values > 0, reproducing the *exact* same result is not always possible
							 * because color-rendering behaviors for out of gamut colors differ, and although SVG specifications
							 * provide for color profiles, most svg implementations do not use them.
							 */
							if(f.brightness!=0){
								var brightness=f.brightness/100;
								var feComponentTransfer_brightness=<feComponentTransfer />;
								var feFuncR=<feFuncR/>;
								var feFuncG=<feFuncG/>;
								var feFuncB=<feFuncB/>;
								feFuncR.@type=feFuncG.@type=feFuncB.@type="linear";
								feFuncR.@slope=feFuncG.@slope=feFuncB.@slope=(
									(
										1+
										Math.max(brightness*2,0)+
										Math.min(brightness*.5,0)
									)
								);
								feFuncR.@intercept=feFuncG.@intercept=feFuncB.@intercept=(
									brightness/8
								);
								feComponentTransfer_brightness.appendChild(feFuncR);
								feComponentTransfer_brightness.appendChild(feFuncG);
								feComponentTransfer_brightness.appendChild(feFuncB);
								feComponentTransfer_brightness['@in']=src;
								feComponentTransfer_brightness.@result=src=prefix+'feComponentTransfer_brightness';
								filter.appendChild(feComponentTransfer_brightness);
							}
							if(f.contrast!=0){
								var contrast=f.contrast/100;
								var feComponentTransfer_contrast=<feComponentTransfer/>;
								var feFuncR=<feFuncR/>;
								var feFuncG=<feFuncG/>;
								var feFuncB=<feFuncB/>;
								feFuncR.@type=feFuncG.@type=feFuncB.@type="linear";
								feFuncR.@slope=feFuncG.@slope=feFuncB.@slope=(
									(
										1+
										Math.max(contrast*4,0)+
										Math.min(contrast,0)
									)
								);
								feFuncR.@intercept=feFuncG.@intercept=feFuncB.@intercept=(
									-Math.min(contrast/16,0)
									-Math.max(contrast/8,0)
								);
								feComponentTransfer_contrast.appendChild(feFuncR);
								feComponentTransfer_contrast.appendChild(feFuncG);
								feComponentTransfer_contrast.appendChild(feFuncB);
								feComponentTransfer_contrast['@in']=src;
								feComponentTransfer_contrast.@result=src=prefix+'feComponentTransfer_contrast';
								filter.appendChild(feComponentTransfer_contrast);
							}
							if(f.saturation!=0){
								var feColorMatrix2=<feColorMatrix/>;
								feColorMatrix2.@type='matrix';
								var s=f.saturation/100+1;
								feColorMatrix2.@values=[
									adjEq.r+(1-adjEq.r)*s,	adjEq.g-adjEq.g*s,	adjEq.b-adjEq.b*s,0,0,
									adjEq.r-adjEq.r*s,	adjEq.g+(1-adjEq.g)*s,	adjEq.b-adjEq.b*s,0,0,
									adjEq.r-adjEq.r*s,	adjEq.g-adjEq.g*s,	adjEq.b+(1-adjEq.b)*s,0,0,
									0,	0,	0,	1,	0
								].join(' ');
								feColorMatrix2['@in']=src;
								feColorMatrix2.@result=src=prefix+'feColorMatrix2';
								filter.appendChild(feColorMatrix2);
							}
							if(f.hue!=0){
								var feColorMatrix=<feColorMatrix/>;
								feColorMatrix.@type='hueRotate';
								feColorMatrix.@values=f.hue;
								feColorMatrix['@in']=src;
								feColorMatrix.@result=src=prefix+'feColorMatrix';
								filter.appendChild(feColorMatrix);
							}
							break;
						case "bevelFilter":
							break;
						case "blurFilter":
							if(
								f.blurX!=0 ||
								f.blurY!=0
							){
								var sx=element.matrix.scaleX;
								var sy=element.matrix.scaleY;

								var feGaussianBlur=<feGaussianBlur />;
								feGaussianBlur.@stdDeviation=[f.blurX / 2, f.blurY / 2].join(' ');
								feGaussianBlur['@in']=src;
								feGaussianBlur.@result=src=prefix+'feGaussianBlur';
								filter.appendChild(feGaussianBlur);

								leftMargin+=f.blurX*4/sx;
								rightMargin+=f.blurX*4/sx;
								topMargin+=f.blurY*4/sy;
								bottomMargin+=f.blurY*4/sy;
							}
							break;
						case "dropShadowFilter":
							break;
						case "glowFilter":

				  				if(f.color.length==7){
									var alpha = 1;
				  				}else{
					  				var alpha = this.precision(parseInt(f.color.substr(7,9), 16) / 0xFF);
					  			}

								var sx=element.matrix.scaleX;
								var sy=element.matrix.scaleY;
								
								var feFlood=<feFlood flood-color={f.color.substr(0, 7)} flood-opacity={alpha}/>;
								filter.appendChild(feFlood);
								
								var feComposite=<feComposite in2="SourceAlpha" operator="in"/>;
								filter.appendChild(feComposite);

								var feGaussianBlur=<feGaussianBlur/>;
								feGaussianBlur.@stdDeviation=[f.blurX / 2, f.blurY / 2].join(' ');
								feGaussianBlur.@result=src=prefix+'feGaussianBlur';
								filter.appendChild(feGaussianBlur);

								filter.appendChild(  <feComponentTransfer result={prefix+'feComponentTransfer'}>
										                 <feFuncA type="linear" slope={f.strength/100} intercept="0" />
										             </feComponentTransfer>   );

								filter.appendChild(  <feMerge>
										                 <feMergeNode />
										                 <feMergeNode in="SourceGraphic" />
										             </feMerge>   );

								leftMargin+=f.blurX*4/sx;
								rightMargin+=f.blurX*4/sx;
								topMargin+=f.blurY*4/sy;
								bottomMargin+=f.blurY*4/sy;

							break;
						case "gradientBevelFilter":
							break;
						case "gradientGlowFilter":
							break;
					}
				}
				filter.@filterUnits="objectBoundingBox";
				if(boundingBox){
					var width=this.precision((1+(leftMargin+rightMargin)/(boundingBox.right-boundingBox.left))*100);
					var height=this.precision((1+(topMargin+bottomMargin)/(boundingBox.bottom-boundingBox.top))*100);
					var x=this.precision((-leftMargin/(boundingBox.right-boundingBox.left))*100);
					var y=this.precision((-topMargin/(boundingBox.bottom-boundingBox.top))*100);
					filter.@width=String(width)+'%';
					filter.@height=String(height)+'%';
					filter.@x=String(x)+'%';
					filter.@y=String(y)+'%';
				}else{
					filter.@width='120%';
					filter.@height='120%';
					filter.@x='-10%';
					filter.@y='-10%';
				}
				if( ( element?element.colorMode!='none':false ) || settings.color || transAnimObj ){

					if(transAnimObj){
						var ro = this.precision(color.amount[0] / 0xff);
						var rm = this.precision(color.percent[0] / 100);
						var go = this.precision(color.amount[1] / 0xff);
						var gm = this.precision(color.percent[1] / 100);
						var bo = this.precision(color.amount[2] / 0xff);
						var bm = this.precision(color.percent[2] / 100);
						var ao = this.precision(color.amount[3] / 0xff);
						var am = this.precision(color.percent[3] / 100);

						var feComponentTransfer = new XML(	  '<feComponentTransfer in="'+src+'" result="colorTrans">'+
																'<feFuncR type="linear" slope="'+rm+'" intercept="'+ro+'"/>'+
																'<feFuncG type="linear" slope="'+gm+'" intercept="'+go+'"/>'+
														        '<feFuncB type="linear" slope="'+bm+'" intercept="'+bo+'"/>'+
														        '<feFuncA type="linear" slope="'+am+'" intercept="'+ao+'"/>'+
														      '</feComponentTransfer>');
						src = "colorTrans";
						transAnimObj.colorTransNode = feComponentTransfer;
						filter.appendChild(feComponentTransfer);

					}else if(color.percent[0]==100 &&
						color.percent[1]==100 &&
						color.percent[2]==100 &&
						color.amount[0]==0 &&
						color.amount[2]==0 &&
						color.amount[3]==0 &&
						(color.amount[4]==0 || color.amount[4]==undefined)){

						if(color.percent[3]!=100){
							xml.@opacity = color.percent[3]/100;
						}

					}else{
						feColorMatrix=<feColorMatrix type="matrix" />;
						feColorMatrix['@in']=src;
						feColorMatrix.@values=[
							this.precision(color.percent[0]/100),0,0,0,this.precision(color.amount[0]/0xFF),
							0,this.precision(color.percent[1]/100),0,0,this.precision(color.amount[1]/0xFF),
							0,0,this.precision(color.percent[2]/100),0,this.precision(color.amount[2]/0xFF),
							0,0,0,this.precision(color.percent[3]/100),this.precision(color.amount[3]/0xFF)
						].join(' ');
						feColorMatrix['@result']=src="colorTrans";
						filter.appendChild(feColorMatrix);
					}
				}
			}
			if(filter && filterID && filter.*.length()){
				defs.appendChild(filter);
				return filterID;
			}
		},
		_simplifyColorTrans:function(colorTransXML, elementXML){
			if(colorTransXML..animate.length()==0){
				var matStr = [
							colorTransXML.feFuncR.@slope,0,0,0,colorTransXML.feFuncR.@intercept,
							0,colorTransXML.feFuncG.@slope,0,0,colorTransXML.feFuncG.@intercept,
							0,0,colorTransXML.feFuncB.@slope,0,colorTransXML.feFuncB.@intercept,
							0,0,0,colorTransXML.feFuncA.@slope,colorTransXML.feFuncA.@intercept
						].join(' ');
				var par = colorTransXML.parent();
				if(matStr != "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"){
					var colorTrans = new XML('<feColorMatrix type="matrix" in="'+colorTransXML['@in']+'" result="'+colorTransXML['@result']+'" values="'+matStr+'"/>');
					par.appendChild(colorTrans);
					delete par.children()[colorTransXML.childIndex()];

				}else{
					if(par.children().length()==1){
						// remove whole filter stack
						delete elementXML.@filter;
						delete par.parent().children()[par.childIndex()];
					}else{
						// plug filters back together
						delete par.children()[colorTransXML.childIndex()];
					}
				}
			}else{
				this._simplifyColorNode(colorTransXML, 'feFuncR');
				this._simplifyColorNode(colorTransXML, 'feFuncG');
				this._simplifyColorNode(colorTransXML, 'feFuncB');
				this._simplifyColorNode(colorTransXML, 'feFuncA');
			}
			return colorTransXML;
		},
		_simplifyColorNode:function(colorTransXML, nodeName){
			var node = colorTransXML.elements(nodeName)[0];
			if( node.@slope=="1" && node.@intercept=="0" && node.animate.length()==0){
				delete colorTransXML.children()[node.childIndex()];
			}
		},
		_addSoundNode:function(defs, frameNode, frame, beginAnimation, beginOffset, frameN){
			// TODO: support frame.soundEffect

			beginOffset = this.precision( beginOffset + frameN / ext.doc.frameRate );

			if(beginAnimation=="0s"){
				beginAnim = (beginOffset ? beginOffset + "s": "0s");
			}else{
				beginAnim = beginAnimation + (beginOffset ? "+" + beginOffset + "s" : "");
			}

			if(!this._soundNode){
				this._soundNode = new XML("<foreignObject/>");
				defs.appendChild(this._soundNode);
			}

			var item = frame.soundLibraryItem;
			var soundId = this._soundIds[item.name];
			if(!soundId){
				soundId = this._uniqueID("audio");
				this._soundIds[item.name] = soundId;
				var soundURI = this._getAssetUri(item, this._sounds, "aud", "mp3");

				var type = soundURI.extension=="wav" ? "audio/wav" : "audio/mpeg3";

				var elem = new XML('<audio xmlns="http://www.w3.org/1999/xhtml" id="'+soundId+'"><source src="'+soundURI+'" type="'+type+'" /></audio>');
				this._soundNode.appendChild(elem);
			}

			var repeatDur;
			if(frame.soundSync=="stream"){
				repeatDur = ' repeatDur="'+this.precision( frame.duration / ext.doc.frameRate )+'s"';
			}else{
				repeatDur = "";
			}
			var repeat;
			if(frame.soundLoopMode=="loop"){
				repeat = " repeat='indefinite'";
			}else if(frame.soundLoop>1){
				repeat = " repeat='"+frame.soundLoop+"'";
			}else{
				repeat = "";
			}
			var action = (frame.soundSync=="stop" ? "stop" : "play");

			frameNode.appendChild(new XML('<g><set attributeName="display" begin="'+beginAnim+'"'+repeat+repeatDur+' to="inline" onbegin="window.document.getElementById(\''+soundId+'\').'+action+'()"/></g>'));
		},
		_getBitmapInstance:function(bitmapInstance,options){
			var item=bitmapInstance.libraryItem;
			var bitmapURI=this._getBitmapItem(item);
			var xml=<image overflow='visible' />;
			xml['@xlink-href']=bitmapURI;
			var bits=bitmapInstance.getBits();
			xml.@height=bitmapInstance.vPixels;
			xml.@width=bitmapInstance.hPixels;
			xml.@transform=this._getMatrix(bitmapInstance.matrix);
			return xml;
		},
		_getBitmapItem:function(item){
			return this._getAssetUri(item, this._bitmaps, "img", "png");
		},
		_getAssetUri:function(item, cache, type, fileExt){
			var uri=cache[item.name];
			if(!uri){
				uri=this.file.dir+'/'+type+"/"+item.name;
				if(!uri.extension){
					var ext = item.sourceFilePath.extension;
					if(ext){
						var re=new RegExp('\.'+ext+'$');
						uri+='.'+ext;
					}else{
						uri += "."+fileExt;
					}
				}
				var success,xml;
				if(item.sourceFileExists && item.sourceFileIsCurrent){
					if(item.sourceFilePath!=uri){
						if(FLfile.exists(uri)){
							FLfile.remove(uri);
						}
						success=FLfile.copy(item.sourceFilePath, uri);
						if(!success){
							FLfile.write(uri,FLfile.read(item.sourceFilePath));
						}
					}
				}else if(FLfile.exists(uri)){
					var uniqueFileName=uri.uniqueFileName;
					if(!item.exportToFile(uniqueFileName)){
						fl.trace("WARNING: Failed to export image to url "+uniqueFileName);
					}else{
						var compareStr=FLfile.read(uri);
						if(FLfile.read(uniqueFileName)==FLfile.read(uri)){
							FLfile.remove(uniqueFileName);
						}else{
							uri=uniqueFileName;
						}
					}
				}else{
					if(!FLfile.exists(uri.dir)){
						FLfile.createFolder(uri.dir);
					}
					if(!item.exportToFile(uri)){
						fl.trace("WARNING: Failed to export image to url "+uri);
					}
				}
				uri=uri.relativeTo(this.file.dir);
				cache[item.name]=uri;
			}
			return uri;
		},
		/**
		 * Retrieves svg data for a Shape Element.
		 * @parameter {extensible.Shape} shape
		 * @parameter {Object} options
		 * @parameter {Matrix} options.matrix
		 * @parameter {extensible.Color} options.colorTransform
		 * @parameter {Number} frame
		 * @private
		 * 
		 */
		_getShape:function(shape,options){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG._getShape()');	
			}
			var settings=new ext.Object({
				matrix:new ext.Matrix(),
				colorTransform:null,
				frame:null
			});
			settings.extend(options);
			var dom = settings.dom;

			var matrix=shape.matrix;
			var descendantMatrix=new ext.Matrix();
			var pathMatrix=null;
			var layerLocked=shape.layer.locked;
			//var id;
			if( shape.isRectangleObject || shape.isOvalObject ){ // ! important
				/*id=(
					shape.isRectangleObject?
					this._uniqueID('rectangleObject'):
					this._uniqueID('ovalObject')
				);*/
				shape.setTransformationPoint({x:0.0,y:0.0});
				var origin=new ext.Point({
					x:(shape.objectSpaceBounds.left-shape.objectSpaceBounds.right)/2,
					y:(shape.objectSpaceBounds.top-shape.objectSpaceBounds.bottom)/2
				}).transform(matrix);
				matrix.tx=origin.x;
				matrix.ty=origin.y;
				//matrix=matrix.concat(settings.matrix);
				matrix=fl.Math.concatMatrix(matrix, settings.matrix);
				if(shape.objectSpaceBounds.left!=0 || shape.objectSpaceBounds.top!=0){
					pathMatrix=new ext.Matrix({
						tx:-shape.objectSpaceBounds.left,
						ty:-shape.objectSpaceBounds.top
					});
				}
			}else if(shape.isDrawingObject){
				//id=this._uniqueID('drawingObject');
				//matrix=matrix.concat(settings.matrix);
				matrix=fl.Math.concatMatrix(matrix, settings.matrix);
			}else if(shape.isGroup){
				//id=this._uniqueID('group');

				descendantMatrix = matrix.invert();
				matrix = new ext.Matrix();
				if(this._appVersion<12){
					// an issue before CS6 resulted in groups having incorrect transforms
				}else{
					matrix=fl.Math.concatMatrix(matrix, settings.matrix);
				}
				//matrix=matrix.concat(settings.matrix);
			}else{
				//id=this._uniqueID('shape');
				matrix.tx = 0;//shape.left;
				matrix.ty = 0;//shape.top;
				//matrix=matrix.concat(settings.matrix);
				matrix = fl.Math.concatMatrix(matrix, settings.matrix);
				/*if(shape.left!=0 || shape.top!=0 ){
					pathMatrix = new ext.Matrix({tx:shape.left, ty:shape.top});
					pathMatrix = pathMatrix.invert();
				}*/
			}
			var contours=shape.contours;
			if(!(contours && contours.length) && !shape.isGroup){
				return;	
			}
			var pathList=new ext.Array();
			var filled=new ext.Array();
			var edgeIdLists=new ext.Array();
			var oppFillsLists=new ext.Array();
			var polygonsList=new ext.Array();
			var holes=new ext.Array();
			var strokesDone={};
			//var ii;
			var validContours=new ext.Array([]);
			for(i=0; i<contours.length; i++){
				var contour = contours[i];
				var s=this._getContour(contour,polygonsList,{
					edgeIdLists:edgeIdLists,
					contoursList:validContours,
					pathList:pathList,
					colorTransform:settings.colorTransform,
					matrix:pathMatrix,
					holes:holes,
					strokesDone:strokesDone,
					dom:dom
				});
			}
			for(var j=0; j<holes.length; j++){
				var holeObj = holes[j];
				var contour = holeObj.contour;
				var edgeIDs = holeObj.edgeIDs;
				var pathStr = holeObj.pathStr;
				var holePoly = holeObj.polygon;

				var oppFills = new ext.Array();;
				for(var i=0;i<contours.length;i++){
					var othContour = contours[i];
					if(othContour==contour)continue;

					if(othContour.edgeIDs.intersect(edgeIDs).length>0){
						oppFills.push(othContour.fill);
					}
				}
				for(var i=0; i<holeObj.maxPath; i++){
					var otherG = pathList[i].node;
					var othEdges = edgeIdLists[i];
					var othContour = validContours[i];
					var othPolys = polygonsList[i];
					var paths = otherG.path;

					if(oppFills.length && !edgeIDs.intersect(othEdges).length && oppFills.indexOf(othContour.fill)==-1)continue;

					for(var k=0; k<paths.length(); k++){
						var pathNode = paths[k];
						if(pathNode.@fill=="none")continue;

						if(!ext.Geom.intersects(othPolys[k], holePoly)){
							continue;
						}

						var d = pathNode.@d.toString();
						d = d.replace("z", '');
						d += " "+pathStr;

						if(pathNode.@stroke.length()){
							var newNode = new XML('<path fill="'+pathNode.@fill+'" d="'+d+'"/>\n');
							otherG.insertChildBefore(pathNode, newNode);
							pathNode.@fill = "none";
							++k;
						}else{
							pathNode.@d = d;
						}
					}
				}
			}
			var svg=new XML('<g/>');
			var matrixStr = this._getMatrix(matrix);
			if(matrixStr!=this.IDENTITY_MATRIX)svg['@transform']=matrixStr;
			for(var i=0;i<pathList.length;i++){
				svg.appendChild(pathList[i].node);
			}
			if(
				shape.isGroup && 
				!shape.isDrawingObject && 
				!shape.isRectangleObject &&
				!shape.isOvalObject
			){
				var g=shape.members;
				for(i=0;i<g.length;i++){
					var e=this._getElement(
						g[i],
						{
							colorTransform:settings.colorTransform,
							matrix:descendantMatrix,
							frame:settings.frame,
							dom:dom,
							animOffset:settings.animOffset,
							frameCount:settings.frameCount,
							//totalDuration:settings.totalDuration,
							beginAnimation:settings.beginAnimation,
							beginOffset:settings.beginOffset,
							repeatCount:settings.repeatCount,
							loopTweens:settings.loopTweens,
							discreteEasing:this.discreteEasing,
							flattenMotion:this.flattenMotion
						}
					);
					if(e)svg.appendChild(e);
				}
			}
			if(ext.log){
				ext.log.pauseTimer(timer);	
			}
			return svg;		
		},
		_getContour:function(contour, polygonsList, options){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG._getContour()');	
			}
			var settings=new ext.Object({
				matrix:null,
				reversed:false,
				colorTransform:null,
				filledOnly:false,
				edgeIdLists:null,
				pathList:null,
				contoursList:null,
				holes:null
			});
			settings.extend(options);
			var dom = settings.dom;
			var curveDeg = this.curveDegree;
			var edgeIdLists = settings.edgeIdLists;
			var contoursList = settings.contoursList;
			var pathList = settings.pathList;
			var holes = settings.holes;
			var strokesDone = settings.strokesDone;

			var xform='';
			if(settings.matrix){
				xform=' transform="'+this._getMatrix(settings.matrix)+'" ';
			}


			var fill=this._getFill(contour.fill,{
				shape : contour.shape
			});

			var opacityString = "";
			var filledPath;
			var paths = [];
			if(fill){
				if(fill.name()=='solidColor'){
					fillString=String(fill['@solid-color']);
					var fillOp = String(fill['@solid-opacity']);
					if(fillOp && fillOp.length){
						opacityString = ' fill-opacity="'+fillOp+'"';
					}
				}else{
					if(!fill.parent()){
						dom.defs.appendChild(fill)
					}
					fillString='url(#'+String(fill['@id'])+')';
				}
				var fillString = ' fill="'+fillString+'"';
			}else{
				var fillString = ' fill="none"';
			}
			filledPath = {stroke:"", fill:fill, fillString:fillString, contours:[]};
			paths.push(filledPath);

			var he = contour.$.getHalfEdge(); 
			var iStart = he.id; 
			var id = 0; 
			var shape = contour.shape.$;
			var strokeMap = {};
			var currPath;
			var lastStroke;
			var edgeIDs = new ext.Array();
			while (id != iStart) 
			{ 
				var e = he.getEdge();
				if(edgeIDs.indexOf(e.id)<0){
					edgeIDs.push(e.id);
				}
				try{
					var cubicSegmentIndex = curveDeg==3?e.cubicSegmentIndex:-1;
				}catch(e){
					cubicSegmentIndex = -1;
				}
				var cp;
				if(e.isLine){
					cp =[e.getControl(0), e.getControl(2)];
				}else{
					if(curveDeg==3){
						if(cubicSegmentIndex && cubicSegmentIndex!=-1){
							cp = shape.getCubicSegmentPoints(cubicSegmentIndex);
						}else{
							cp = [e.getControl(0), e.getControl(1), e.getControl(2)];
						}
					}else{
						cp = [e.getControl(0), e.getControl(1), e.getControl(2)];
					}
				}
				if(e.getHalfEdge(1).id == he.id){
					cp = cp.reverse();
				}

				var strokeStyle = (strokesDone[e.id] ? "noStroke" : e.stroke.style );
				if(e.stroke.style !="noStroke"){
					strokesDone[e.id] = true;
				}

				if(!settings.filledOnly && strokeStyle){
					if(strokeStyle!='noStroke'){
						var stroke = " "+this._getStroke(e.stroke, {dom:dom});

						if(!currPath || stroke!=lastStroke){
							currPath = strokeMap[stroke];
							if(!currPath){
								currPath = {stroke:stroke, fillString:" fill='none'", contours:[]};
								paths.push(currPath);
								strokeMap[stroke] = currPath;
							}
							lastStroke = stroke;
						}
						currPath.contours.push(cp);
					}else{
						currPath = null;
						lastStroke = 'noStroke';
					}
				}
				if(filledPath){
					filledPath.contours.push(cp);
				}

				he = he.getNext(); 
				id = he.id; 
			}
			if(!contour.interior && !lastStroke)return;

			if(filledPath && paths.length>1){
				var firstStroke = paths[1];
				if(filledPath.contours.length==firstStroke.contours.length){
					// stroke and fill have the same paths, combine
					filledPath.stroke = firstStroke.stroke;
					paths.splice(1,1);
				}
			}

			var hasOtherFills = false;
			for(var i=0; i<pathList.length; ++i){
				if(pathList[i].fill!=null){
					hasOtherFills = true;
					break;
				}
			}

			var cutHole = contour.interior && !fill && hasOtherFills;
			var reverse = settings.reversed || contour.orientation==1;
			if(opacityString!="" || (fill && fill.name().toString().indexOf("Gradient")!=-1 && fill..stop.( @["stop-opacity"].toString() != "1" ).length())){
				// Fills with an alpha channel should cut holes in fills so that the other fill doesn't show through
				cutHole = true;
			}
			if(cutHole && pathList.length)reverse = !reverse;

			var degPrefix=['M','L','Q','C'];
			var pathNodes = [];
			var polygons = [];
			//fl.trace("\nContour: "+paths.length+" int: "+contour.interior+" ori: "+contour.orientation+" "+fillString+" cut:"+cutHole+" r:"+reverse);
			//fl.trace("edges: "+edgeIDs+" "+filledPath);
			for (var i=0; i<paths.length; i++) 
			{ 
				currPath = paths[i];
				var pathStr = '';
				var lastDeg = null;
				var lastPoint = null;


				if(reverse){
					currPath.contours.reverse();
				}

				var polygon = [];
				for(var j=0; j<currPath.contours.length; j++){
					cp = currPath.contours[j];
					if(reverse){
						cp.reverse();
					}
					var firstPoint = cp[0];
					if(!lastPoint || lastPoint.x!=firstPoint.x || lastPoint.y!=firstPoint.y){
						lastDeg = degPrefix[0];
						pathStr += lastDeg+this.precision(firstPoint.x)+","+this.precision(firstPoint.y);
						if(!lastPoint)polygon.push({x:firstPoint.x, y:firstPoint.y});
					}
					var deg = degPrefix[cp.length-1];
					if(deg!=lastDeg){
						pathStr += deg;
						lastDeg = deg;
					}else{
						pathStr += " ";
					}
					for(var k=1; k<cp.length; k++){
						if(k!=1)pathStr += " ";
						var point = cp[k];
						pathStr += this.precision(point.x)+","+this.precision(point.y);
					}
					polygon.push({x:point.x, y:point.y});
					lastPoint = point;
				}
				if(cutHole && i==0){
					holes.push({contour:contour, edgeIDs:edgeIDs, pathStr:pathStr, polygon:polygon, maxPath:pathList.length});
					if(fill || currPath.stroke){
						polygons.push(polygon);
						pathNodes.push('<path ' + currPath.fillString + opacityString + currPath.stroke + ' d="' + pathStr + '"/>\n');
					}
				}else if(currPath.fill || currPath.stroke){
					polygons.push(polygon);
					pathNodes.push('<path ' + currPath.fillString + opacityString + currPath.stroke + ' d="' + pathStr + '"/>\n');
				}
			}

			if(polygons.length){
				edgeIdLists.push(edgeIDs);
				contoursList.push(contour);
				polygonsList.push(polygons);
				var xmlStr  = '<g'+xform+'>'+pathNodes.join("")+"</g>";

				if(ext.log){
					ext.log.pauseTimer(timer);	
				}
				filledPath.node = new XML(xmlStr);
				pathList.push(filledPath);
			}
		},
		/**
		 * Returns a paint server for the specified fill.
		 * @param {extensible.Fill} fillObj
		 * @private {Object} options
		 */
		_getFill:function(fillObj,options){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG._getFill()');	
			}
			var settings=new ext.Object({
				shape:undefined,
				gradientUnits:'userSpaceOnUse' // objectBoundingBox, userSpaceOnUse
			});
			settings.extend(options);
			if(typeof fillObj=='string'){
				fillObj=new ext.Fill(fillObj);
			}else if(fillObj.style=='noFill'){
				if(ext.log){ext.log.pauseTimer(timer);}
				return;
			}
			id=this._uniqueID(fillObj.style);
			var xml,defaultMeasurement;
			var shape=settings.shape;
			var matrix=fillObj.matrix;
			switch(fillObj.style){
				case 'linearGradient':
					defaultMeasurement=this.DEFAULT_GRADIENT_LENGTH;
				case 'radialGradient':
					defaultMeasurement=defaultMeasurement||this.DEFAULT_GRADIENT_RADIUS;
					if(!shape){
						if(ext.log){ext.log.pauseTimer(timer);}
						return;
					}
					xml=new XML('<'+fillObj.style+'/>');
					xml['@gradientUnits']=settings.gradientUnits;
					xml['@color-interpolation']=fillObj.linearRGB?'linearRGB':'sRGB';
					switch(fillObj.overflow){
						case 'extend':
							xml['@spreadMethod']='pad';
							break;
						case 'reflect':
							xml['@spreadMethod']='reflect';
							break;
						case 'repeat':
							xml['@spreadMethod']='repeat';
							break;
					}
					for(var i=0;i<fillObj.colorArray.length;i++){
						var stop=new XML('<stop/>');
						var c=new ext.Color(fillObj.colorArray[i]);
						stop['@stop-color']=c.hex;
						stop['@stop-opacity']=c.opacity;
						if(i<fillObj.posArray.length){
							stop['@offset']=String(Math.roundTo((fillObj.posArray[i]/255.0),this.decimalPointPrecision+2));
						}
						xml.appendChild(stop);
					}
					var width=shape.objectSpaceBounds.right-shape.objectSpaceBounds.left;
					var height=shape.objectSpaceBounds.bottom-shape.objectSpaceBounds.top;
					var p0;
					var p1=new ext.Point({x:0,y:0});
					var p2;
					var unitID='';
					if(settings.gradientUnits=='objectBoundingBox'){
						unitID='%';
						p2=new ext.Point({
							x:((defaultMeasurement)/width)*100,
							y:0
						});
					}else{
						p2=new ext.Point({
							x:defaultMeasurement,
							y:0
						});
					}
					p0=p2.reflect(p1);
					switch(fillObj.style){
						case 'radialGradient':
							var mx=new ext.Matrix({
								a:matrix.scaleX,
								b:0,
								c:0,
								d:matrix.scaleX,
								tx:matrix.tx,
								ty:matrix.ty
							});
							p0=p0.transform(mx);
							p1=p1.transform(mx);
							p2=p2.transform(mx);
							matrix=mx.invert().concat(matrix);
							var bias=(fillObj.focalPoint+255)/510;
							var fp=p0.midPoint(p2,bias);
							xml['@r']=String(p1.distanceTo(p2))+unitID;
							xml['@cx']=String(p1.x)+unitID;
							xml['@cy']=String(p1.y)+unitID;
							xml['@fx']=String(fp.x)+unitID;
							xml['@fy']=String(fp.y)+unitID;
							xml['@gradientTransform']=this._getMatrix(matrix);
							break;
						case 'linearGradient':
							p0=p0.transform(matrix);
							p1=p1.transform(matrix);
							p2=p2.transform(matrix);
							xml['@x1']=String(p0.x)+unitID;
							xml['@y1']=String(p0.y)+unitID;
							xml['@x2']=String(p2.x)+unitID;
							xml['@y2']=String(p2.y)+unitID;
							break;
					}
					break;
				case 'bitmap':
					xml=<pattern/>;
					var image=<image/>;
					xml.@patternUnits=xml.@patternContentUnits='userSpaceOnUse';
					var item=ext.lib.getItem(fillObj.bitmapPath);
					var bitmapURI=this._getBitmapItem(item);
					image['@xlink-href']=bitmapURI;
					xml.@width=image.@width=item.width;
					xml.@height=image.@height=item.height;
					xml.@viewBox='0 0 '+String(xml.@width)+' '+String(xml.@height);
					var fMatrix=new ext.Matrix(fillObj.matrix);
					fMatrix.a*=this.DEFAULT_BITMAP_SCALE;
					fMatrix.b*=this.DEFAULT_BITMAP_SCALE;
					fMatrix.c*=this.DEFAULT_BITMAP_SCALE;
					fMatrix.d*=this.DEFAULT_BITMAP_SCALE;
					xml.@patternTransform=this._getMatrix(fMatrix);
					if(this.convertPatternsToSymbols){
						var symbol=<symbol id={this._uniqueID(fillObj.bitmapPath.basename+'_symbol')} />;
						symbol.@viewBox=String(xml.@viewBox);
						var use=<use />;
						use.@width=String(image.@width);
						use.@height=String(image.@height);
						use.@x=use.@y=0;
						use['@xlink-href']='#'+String(symbol.@id);
						use.@externalResourcesRequired='true';
						symbol.appendChild(image);
						xml.appendChild(symbol);
						xml.appendChild(use);
					}else{
						xml.appendChild(image);
					}
					break;
				case 'solid':
					var color=new ext.Color(fillObj.color);
					xml=new XML('<solidColor/>');
					xml['@solid-color']=color.hex;
					if(color.opacity<1)xml['@solid-opacity']=this.precision(color.opacity);
					break;
			}
			var str = xml.toXMLString();
			var cached = this._fillMap[str];
			if(cached){
				xml = cached;
			}else{
				this._fillMap[str] = xml;
				xml['@id']=id;
			}
			if(ext.log){ext.log.pauseTimer(timer);}
			return xml;
		},
		/**
		 * Returns stroke attribute string.
		 * If the stroke has a shapeFill, a paint server for the specified fill
		 * is inserted under dom.defs.
		 * @param {extensible.Fill} fillObj
		 * @param {Object} options Options object, passed on to _getFill() if 
		 * a shapeFill is present.
		 * @return {String} Returns stroke attributes.
		 * @private
		 */
		_getStroke:function(stroke,options){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG._getStroke()');	
			}
			var dom = options.dom;
			var svg=[];
			var fillString,opacityString;
			if(stroke.shapeFill && stroke.shapeFill!='noFill'){
				var fill=this._getFill(
					stroke.shapeFill,
					options
				);
				if(fill){
					if(fill.name()=='solidColor'){
						fillString=String(fill['@solid-color']);
						opacityString=String(fill['@solid-opacity']);
					}else{
						if(!fill.parent()){
							dom.defs.appendChild(fill)
						}
						fillString='url(#'+String(fill['@id'])+')';
					}
				}
			}else{
				var color=new ext.Color(stroke.color);
				fillString=color.hex;
				if(color.opacity<1){
					opacityString=String(color.opacity);
				}
			}
			svg.push('stroke="'+fillString+'" ');
			if(opacityString){
				svg.push('stroke-opacity="'+opacityString+'"');
			}
			if(stroke.thickness!=1){
				if(stroke.thickness<=0.1){
					svg.push('stroke-width="1"');
				}else{
					svg.push('stroke-width="'+stroke.thickness+'"');
				}
			}
			var joinType = stroke.joinType;
			if(this.avoidMiter && joinType=='miter')joinType = "round";
			
			svg.push(
				'stroke-linecap="'+(stroke.capType=='none'?'round':stroke.capType)+'"',
				'stroke-linejoin="'+joinType+'"'
			);
			if(joinType=='miter'){
				svg.push('stroke-miterlimit="'+stroke.miterLimit+'"');
				this._showMiterWarning = true;
			}
			if(stroke.scaleType=='none' || stroke.thickness<=0.1){
				svg.push('vector-effect="non-scaling-stroke"');
			}
			if(ext.log){
				ext.log.pauseTimer(timer);	
			}
			return svg.join(' ')+' ';
		},
		_getText:function(element,options){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG._getText()');	
			}
			var settings=new ext.Object({});
			settings.extend(options);
			var xml;
			if(this.convertTextToOutlines){
				var timeline=element.timeline;
				if(element instanceof ext.Text){
					if(
						!element.$.length
					){
						return;	
					}
					var	textWidth=element.$.textWidth;
					var	textHeight=element.$.textHeight;
				}
				var layer=element.layer;
				var frame=(
					settings.frame!=undefined?
					layer.frames[settings.frame]:
					element.frame
				);
				var index=element.frame.elements.expandGroups().indexOf(element);
				var matrix=element.matrix;
				var id=element.uniqueDataName(String('temporaryID_'+String(Math.floor(Math.random()*9999))));
				var pd=Math.floor(Math.random()*99999999);
				element.setPersistentData(id,'integer',pd);

				timeline.setSelectedLayers(layer.index);
				timeline.copyFrames(frame.startFrame);

				var currentTimeline = ext.timeline;
				currentTimeline.setSelectedLayers(currentTimeline.layerCount-1);
				
				var tempLayerIndex = currentTimeline.addNewLayer('temp','normal',false);
				currentTimeline.setSelectedLayers(tempLayerIndex);
				currentTimeline.pasteFrames(0);
				currentTimeline.layers[tempLayerIndex].locked = false; // pasting frames can lock layer

				var searchElements=currentTimeline.layers[tempLayerIndex].frames[0].elements;
				var tempElement=searchElements.expandGroups()[index];
				var parentGroups=tempElement.getParentGroups();
				if(parentGroups && parentGroups.length){
					ext.sel=[parentGroups[0]];
					for(var i=0;i<searchElements.length && ext.sel.length==0;i++){
						ext.doc.exitEditMode();
						ext.sel=[parentGroups[0]];
					}
					for(var i=0;i<parentGroups.length;i++){
						ext.doc.breakApart();
					}
					ext.doc.selectNone();
				}
				searchElements=currentTimeline.layers[tempLayerIndex].frames[0].elements;
				for(var i=0;i<searchElements.length;i++){
					if(
						searchElements[i].hasPersistentData(id) &&
						searchElements[i].getPersistentData(id)==pd
					){
						tempElement=searchElements[i];
					}else{
						//for(var i=0;i<10 && ext.sel.length==0;i++){
							ext.sel=[searchElements[i]];
						//}
						//if(ext.sel.length){
							ext.doc.deleteSelection();
						//}
					}
				}
				var tempMatrix=new ext.Matrix();
				tempElement.matrix=tempMatrix;
				if(element instanceof ext.Text){
					tempElement.$.textType='static';
					tempElement.$.textHeight=textHeight;
					tempElement.$.textWidth=textWidth;
				}else{
					tempMatrix.a=(
						new ext.Point({
							x:tempElement.matrix.a,
							y:tempElement.matrix.b
						})
					).length;
					tempMatrix.d=(
						new ext.Point({
							x:tempElement.matrix.c,
							y:tempElement.matrix.d
						})
					).length;	
				}
				ext.sel=[tempElement];
				for(var i=0; i<parentGroups.length && ext.sel.length==0; i++){
					ext.doc.exitEditMode();
					ext.sel=[tempElement];
				}
				for(
					i=0;
					i<10 &&
					ext.sel.length>0 &&
					(
						ext.sel[0] instanceof ext.Text ||
						ext.sel[0] instanceof ext.TLFText
					);
					i++
				){
					try{
						ext.doc.breakApart();
					}catch(e){}
				}
				ext.doc.union();
				var mat = fl.Math.concatMatrix(matrix, tempMatrix.invert());
				if(options.matrix){
					mat = fl.Math.concatMatrix(mat, options.matrix);
				}
				options.matrix = mat;
				var xml=this._getShape(currentTimeline.layers[tempLayerIndex].elements[0],options);
				currentTimeline.deleteLayer(tempLayerIndex);
				element.removePersistentData(id);
				if(ext.log){
					ext.log.pauseTimer(timer);	
				}
				return xml;
			}else{
				var text = element.$;
				var textRuns = text.textRuns;
				var mat = element.matrix.clone();
				var skX = text.skewX;
				var skY = text.skewY;
				var rot = text.rotation;
				var scX = text.scaleX;
				var scY = text.scaleY;
				text.skewX = 0;
				text.skewY = 0;
				text.rotation = 0;
				text.scaleX = 1;
				text.scaleY = 1;
				var width = text.width;
				var height = text.height;
				element.matrix = mat;

				var lineSpacing = textRuns[0].textAttrs.lineSpacing * 8.5/10;

				height += lineSpacing;

				var xml = new XML("<foreignObject width='"+(width+1)+"' height='"+(height+1)+"'></foreignObject>");


				/*if(textRuns.length==1){
					xml.appendChild(new XML("<span xmlns='http://www.w3.org/1999/xhtml'"+this._getTextRunAttrs(textRuns[0].textAttrs)+">"+textRuns[0].characters+"</span>"));*/

				if(text.textType=="input"){
					xml.appendChild(new XML("<input xmlns='http://www.w3.org/1999/xhtml'"+this._getTextFieldAttrs(text, width, height, textRuns[0].textAttrs, true, true)+" value='"+textRuns[0].characters+"'></input>"));
				}else if(textRuns.length==1 && !textRuns[0].textAttrs.url){
					var textRun = textRuns[0];
					var textAttrs = textRun.textAttrs;
					var openTags = "";
					var closeTags = "";
					if(textRun.textAttrs.characterPosition=="subscript"){
						openTags = "<sub>"+openTags;
						closeTags = closeTags+"</sub>";
					}else if(textRun.textAttrs.characterPosition=="superscript"){
						openTags = "<sup>"+openTags;
						closeTags = closeTags+"</sup>";
					}
					xml.appendChild(new XML("<div xmlns='http://www.w3.org/1999/xhtml'"+this._getTextFieldAttrs(text, width, height, textAttrs, true, false)+">"+openTags+textRun.characters+closeTags+"</div>"));
				}else{
					var cont = new XML("<div xmlns='http://www.w3.org/1999/xhtml'"+this._getTextFieldAttrs(text, width, height, textRuns[0].textAttrs)+"></div>");
					for(var i=0; i<textRuns.length; i++){
						var textRun = textRuns[i];
						var tag;
						if(textRun.textAttrs.url!=null){
							tag = "a";
						}else{
							tag = "span";
						}
						var openTag = "<"+tag;
						var closeTag = "</"+tag+">";
						if(textRun.textAttrs.characterPosition=="subscript"){
							openTag = "<sub>"+openTag;
							closeTag = closeTag+"</sub>";
						}else if(textRun.textAttrs.characterPosition=="superscript"){
							openTag = "<sup>"+openTag;
							closeTag = closeTag+"</sup>";
						}
						var span = new XML(openTag+this._getTextRunAttrs(textRun.textAttrs)+">"+textRun.characters+closeTag);
						cont.appendChild(span)
					}
					xml.appendChild(cont);
				}
				/*var mat = fl.Math.concatMatrix(matrix, tempMatrix.invert());
				if(options.matrix){
					mat = fl.Math.concatMatrix(mat, options.matrix);
				}*/
				var offset = mat.transformPoint(0, -lineSpacing * 1/2, false);
				mat.tx += offset.x;
				mat.ty += offset.y;
				if(mat.a==1 && mat.b==0 && mat.c==0 && mat.d==1){
					if(mat.tx!=0)xml['@x'] = mat.tx;
					if(mat.ty!=0)xml['@y'] = mat.ty;
				}else{
					xml['@transform'] = this._getMatrix(mat);
				}
			}
			return xml;
		},
		_getTextFieldAttrs:function(textElem, width, height, textAttrs, getAttrs, isInput){
			var ret;
			var style;
			if(getAttrs){
				var obj = this._getTextRunAttrs(textAttrs, true);
				ret = obj.attrs;
				style = obj.styles;
			}else{
				ret = "";
				style = "";
			}
			if(textElem.textType!="static" && textElem.border){
				style += "box-sizing:border-box;";
				style += "border:1px solid #000;";
				style += "background:#FFF;";
			}else if(isInput){
				style += "box-sizing:border-box;";
				style += "border:none;";
				style += "background:none;";
			}
			if(isInput && textElem.lineType=="password"){
				ret += " type='password'";
			}else if(textElem.textType!="static"){
				if(textElem.lineType=="multiline no wrap")style += "white-space: pre;"
				else if(textElem.lineType=="single line")style += "white-space: nowrap;"
			}
			if(isInput && textElem.maxCharacters > 0){
				ret += " maxlength='"+textElem.maxCharacters+"'";
			}
			if(!textElem.selectable){
				style += "cursor:default;";
				style += "-webkit-touch-callout:none;"
			    style += "-webkit-user-select:none;"
			    style += "-moz-user-select:none;"
			    style += "-ms-user-select:none;"
			    style += "user-select:none;"
			}
			style += "width:"+width+"px;";
			style += "height:"+height+"px;";

			if(textElem.orientation != "horizontal"){
				var hor = (textElem.orientation=="vertical left to right" ? "lr" : "rl");

				style += "-ms-writing-mode: tb-"+hor+";";
				style += "-webkit-writing-mode: vertical-"+hor+";";
				style += "-moz-writing-mode: vertical-"+hor+";";
				style += "-ms-writing-mode: vertical-"+hor+";";
				style += "writing-mode: vertical-"+hor+";";

				if(!textAttrs.rotation){
					style += "-webkit-text-orientation: upright;";
					style += "-moz-text-orientation: upright;";
					style += "-ms-text-orientation: upright;";
					style += "text-orientation: upright;";
				}
			}

			if(textAttrs.indent){
				style += "text-indent:"+textAttrs.indent+"px;";
			}
			if(style.length){
				ret += " style='"+style+"'";
			}
			return ret;
		},
		_getTextRunAttrs:function(textAttrs, returnObj){
			var ret = "";
			var style = "";
			var size = textAttrs.size * 3/4;
			if(textAttrs.characterPosition=="subscript" || textAttrs.characterPosition=="superscript"){
				size *= 3/5;
			}
			if(textAttrs.fillColor!="#000"){
				style += "color:"+textAttrs.fillColor+";";
			}
			if(textAttrs.alignment!="left"){
				style += "text-align:"+textAttrs.alignment+";";
			}
			if(textAttrs.lineSpacing!=0){
				style += "line-height:"+(size + (textAttrs.lineSpacing * 8.5/10))+"pt;";
			}
			if(textAttrs.leftMargin!=0){
				style += "padding-left:"+textAttrs.leftMargin+"px;";
			}
			if(textAttrs.rightMargin!=0){
				style += "padding-right:"+textAttrs.rightMargin+"px;";
			}
			if(textAttrs.letterSpacing!=0){
				style += "letter-spacing:"+textAttrs.letterSpacing+"pt;";
			}
			if(textAttrs.bold){
				style += "font-weight:bold;";
			}
			if(textAttrs.italic){
				style += "font-style:italic;";
			}
			if(textAttrs.url){
				ret += " href='"+textAttrs.url+"'";
				if(textAttrs.target){
					ret += " target='"+textAttrs.target+"'";
				}
			}
			if(textAttrs.face){
				var face = textAttrs.face;
				if(face=="_typewriter")face = "Courier New, Courier, monospace";
				else if(face=="_serif")face = "Times New Roman, Times, serif";
				else if(face=="_sans")face = "Arial, Helvetica, sans-serif";
				style += "font-family:"+face+";";
			}
			//if(textAttrs.bold){
				style += "font-size:"+size+"pt;";
			//}

			if(returnObj){
				return {attrs:ret, styles:style};
			}
			if(style.length){
				ret += " style='"+style+"'";
			}
			return ret;
		},
		_applyMatrix:function(toNode, transStr, transMat, upwards){
			if(!toNode.@transform.length()){
				toNode.@transform = transStr;
			}else{
				var frameTrans = new ext.Matrix(toNode.@transform.toString());
				if(upwards){
					var mat = transMat.concat(frameTrans);
				}else{
					var mat = frameTrans.concat(transMat);
				}
				toNode.@transform = this._getMatrix(mat);
			}
		},
		_getMatrix:function(matrix){
			if(!(matrix instanceof ext.Matrix)){
				matrix=new ext.Matrix(matrix);
			}
			return([
				'matrix('+String(this.precision(matrix.a)),
				String(this.precision(matrix.b)),
				String(this.precision(matrix.c)),
				String(this.precision(matrix.d)),
				String(this.precision(matrix.tx)),
				String(this.precision(matrix.ty))+')'
			].join(' '));
		},
		_uniqueID:function(id,xml){
			id = id.replace(' ',"_",'g');
			var invalid=id.match(/[^A-Za-z\d\-\.\:]/g);
			if(invalid && invalid.length){
				for(var i=0;i<invalid.length;i++){
					id=id.replace(
						invalid[i],
						encodeURIComponent(invalid[i]).replace('%',this.MODULO_STAND_IN,'g')
					);
				}
			}		
			if(!id ||!id.length){
				id='g';
			}
			var parts=/(^.*[^\d])([\d]+$)?/.exec(id);
			var base = parts?parts[1]:id; // ids that are all numbers won't match
			var increment=0;
			if(parts && parts.length>2){
				increment=Number(parts[2]);
			}
			if(this._ids[base]!==undefined){
				this._ids[base]+=1;
				return base+String(this._ids[base]);
			}else{
				this._ids[base]=increment;
				return id;
			}
		},
		precision:function(num, precision){
			if(precision==undefined)precision = this.decimalPointPrecision;
			return Math.roundTo(num, precision);
		},
		/**
		 * Applies transformation matrices recursively given an SVG graphic element.
		 * @parameter {XML} xml An SVG graphic element or an SVG document. 
		 */
		applyMatrices:function(xml,defs,strokeX){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG.applyMatrices()');	
			}
			strokeX=strokeX||new ext.Matrix();
			if(typeof xml=='string'){
				xml=new XML(xml);
			}
			defs=defs||xml.defs;
			var bApplyVertices=true;
			var transform,mxs,matrix;
			if(xml.@transform.length()){
				transform=String(xml['@transform']);
				var mxa=transform.match(/matrix\(.*?\)/g);
				if(mxa && mxa.length){
					matrix=new ext.Matrix(mxa[0]);
					transform=transform.replace(/matrix\(.*?\)/g,'');
				}
				if(transform.trim()==''){
					delete xml['@transform'];
				}else{
					xml['@transform']=transform;
				}
			}
			if(!matrix){
				matrix=new ext.Matrix();
				mxa=[this._getMatrix(matrix)];
			}
			var id=String(xml['@id']);
			var reStrokeX=/^group|drawingObject|rectangleObject|ovalObject|path/;
			if(reStrokeX.test(id)){
				strokeX.concat(matrix.invert());
			}else{
				strokeX=new ext.Matrix();
			}
			if(xml.@filter.length() && matrix){
				this._transformFilter(matrix,xml,defs);
			}	
			
			for each(var child in (xml.defs.symbol.*+xml.*)){
				var childName=String(child.localName());
				var cid=child.@id.length() ? String(child['@id']) : '';
				var cmx=undefined;
				var tr= String(child['@transform']);
				var nmx;
				var nmxString;
				if(tr){
					tr=String(tr);
					var cmxa=/matrix\(.*?\)/.exec(tr);
					if(cmxa && cmxa.length){
						cmx=new ext.Matrix(cmxa[0]);
						nmx=cmx.concat(matrix);
						nmxString=this._getMatrix(nmx);
						tr=tr.replace(cmxa[0],nmxString);
					}else{
						tr=mxa[0]+' '+tr;
						nmxString=mxa[0];
						nmx=matrix;
					}
					if(tr==this.IDENTITY_MATRIX){
						delete child['@transform'];
					}else{
						child['@transform']=tr;
					}
				}else{
					nmx=matrix;
					nmxString=mxa[0];
					if(nmxString!=this.IDENTITY_MATRIX){
						child['@transform']=nmxString;
					}
				}				
				if(child.@filter.length() && child.localName()!='g'){
					this._transformFilter(nmx,child,defs);
				}
				if(bApplyVertices){
					var gradientAttr=['stroke','fill'];
					for(var i=0;i<gradientAttr.length;i++){
						var attrString=child['@'+gradientAttr[i]];
						var gradientID=undefined;
						if(attrString){
							attrString=String(attrString);
							var ida=attrString.match(/(?:url\(#)(.*?)(?:\))/);
							if(ida && ida.length>1){
								gradientID=ida[1];
							}
						}
						if(gradientID!==undefined){
							var gradient=defs.*.(@id.toString()==gradientID);
							if(gradient && gradient.length()){
								gradient=gradient[0].copy();
								gradientID=this._uniqueID(String(gradient.@id));
								gradient.@id=gradientID;
								child['@'+gradientAttr[i]]='url(#'+gradientID+')';
								defs.appendChild(gradient);
								if(gradient.localName()=='radialGradient'){
									var gtr=gradient['@gradientTransform'];
									if(gtr){
										gtr=String(gtr);
										var cmxa=/matrix\(.*?\)/.exec(gtr);
										if(cmxa && cmxa.length){
											var cmx=new ext.Matrix(cmxa[0]);
										}else{
											cmx=new ext.Matrix();
										}
									}else{
										cmx=new ext.Matrix();
									}
									var gmx=cmx.concat(nmx);
									var fp=new ext.Point({
										x:Number(gradient['@fx']),
										y:Number(gradient['@fy'])
									});
									var cp=new ext.Point({
										x:Number(gradient['@cx']),
										y:Number(gradient['@cy'])
									});
									var rp=new ext.Point({
										x:cp.x+Number(gradient['@r']),
										y:cp.y
									});
									var mx=new ext.Matrix({
										a:gmx.scaleX,
										b:0,
										c:0,
										d:gmx.scaleX,
										tx:gmx.tx,
										ty:gmx.ty
									});
									fp=fp.transform(mx).roundTo(this.decimalPointPrecision);
									cp=cp.transform(mx).roundTo(this.decimalPointPrecision);
									rp=rp.transform(mx).roundTo(this.decimalPointPrecision);
									gmx=mx.invert().concat(gmx).roundTo(this.decimalPointPrecision);
									gradient['@r']=String(Math.roundTo(cp.distanceTo(rp),this.decimalPointPrecision));
									gradient['@cx']=String(cp.x);
									gradient['@cy']=String(cp.y);
									gradient['@fx']=String(fp.x);
									gradient['@fy']=String(fp.y);
									var gmxString=this._getMatrix(gmx);
									if(gtr){
										gtr=gtr.replace(cmxa[0],gmxString);
									}else{
										gtr=gmxString;
									}
									gradient['@gradientTransform']=gtr;
								}else if(gradient.localName()=='linearGradient'){
									var p1=new ext.Point({
										x:Number(gradient['@x1']),
										y:Number(gradient['@y1'])
									});
									var p2=new ext.Point({
										x:Number(gradient['@x2']),
										y:Number(gradient['@y2'])
									});
									p1=p1.transform(nmx).roundTo(this.decimalPointPrecision);
									p2=p2.transform(nmx).roundTo(this.decimalPointPrecision);
									gradient['@x1']=String(p1.x);
									gradient['@y1']=String(p1.y);
									gradient['@x2']=String(p2.x);
									gradient['@y2']=String(p2.y);
								}else if(gradient.localName()=='pattern'){
									var ptr=gradient.@patternTransform;
									if(ptr){
										ptr=String(ptr);
										var pmxa=/matrix\(.*?\)/.exec(ptr);
										if(pmxa && pmxa.length){
											var pmx=new ext.Matrix(pmxa[0]);
										}else{
											pmx=new ext.Matrix();
										}
									}else{
										pmx=new ext.Matrix();
									}
									gradient.@patternTransform=this._getMatrix(pmx.concat(nmx));
								}
							}
						}
					}
					if(child.@d.length()){
						var curveData=child['@d'];
						var points=curveData.match(/[A-Ya-y]?[\d\.\-]*[\d\.\-][\s\,]*[\d\.\-]*[\d\.\-][Zz]?/g);
						if(points && points.length){
							var newPoints=new ext.Array([]);
							for(var i=0;i<points.length;i++){
								if(points[i].trim()==''){continue;}
								var point=new ext.Point(points[i]);
								point=point.transform(nmx).roundTo(this.decimalPointPrecision);
								var pointString=String(point.x)+','+String(point.y);
								var prefix=/^[A-Za-z]/.exec(points[i]);
								if(prefix){
									pointString=prefix[0]+pointString;
								}
								var suffix=/[A-Za-z]$/.exec(points[i]);
								if(suffix){
									pointString=pointString+suffix[0];
								}
								newPoints.push(pointString);							
							}
							child['@d']=newPoints.join(' ');
							child['@transform']=String(child['@transform']).replace(nmxString,'');
							if(String(child['@transform']).trim()==''){
								delete child['@transform'];
							}
						}
					}
					if(child.@stroke.length()){
						var strokeW = String(child['@stroke-width']);
						if(strokeW)strokeW = Number(strokeW);
						else strokeW = 1;

						var strokeScale=cmx?nmx.concat(strokeX.concat(cmx.invert())):nmx.concat(strokeX);
						var scaleMult = ((strokeScale.scaleX+strokeScale.scaleY)/2);
						if(scaleMult!=1){
							var newThickness = Math.roundTo(strokeW*scaleMult,this.decimalPointPrecision);
							if(newThickness<=1){
								newThickness = 1;
								child['@vector-effect'] = 'non-scaling-stroke';
							}
							child['@stroke-width'] = newThickness;
						}
					}
					
				}
				if(child.* && child.*.length() && childName!='defs'){
					this.applyMatrices(child,defs,strokeX?(cmx?strokeX.concat(cmx.invert()):strokeX):undefined);
				}
			}
			if(ext.log){
				ext.log.pauseTimer(timer);
			}
			return xml;
		},
		_applyColorEffects:function(xml,defs,colorX){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG._applyColorEffects()');	
			}
			var name=xml.localName();
			var skip = false;
			if( name=='filter' || name=='use' || /Gradient/.test(name) || /Color/.test(name)){
				//return;	
				skip = true;
			}
			if(name=='mask' && xml..use.length()>0){
				this.expandUseNow( xml, xml,false,true,defs );
			}
			if(xml..use.length()>0){
				//return;
				skip = true;
			}
			var filter,newFilter;
			var color=colorX;
			if(!skip && xml.@filter.length()){
				var filterID=String(xml.@filter).match(/(?:url\(#)(.*?)(?:\))/);
				if(filterID && filterID.length>1){
					filter=defs.filter.(@id.toString()==filterID[1]);
					if(filter){
						if(filter.length()){
							filter=filter[0];

							color=this._colorFromEffect(filter);
							if(color){
								var n=0;
								if(!color.amount.is([0,0,0,0])){
									n+=1;
								}
								if(!color.percent.is([100,100,100,100])){
									n+=1;
								}
								if(filter.*.length()<=n){
									delete xml.@filter;
								}else{
									newFilter=filter.copy();
									var newFilterID=this._uniqueID(String(newFilter.@id));
									newFilter.@id=newFilterID;
									xml.@filter="url(#"+newFilterID+")";
									if(!color.amount.is([0,0,0,0])){
										delete newFilter.feComponentTransfer.(@result.toString()=='colorEffect_amount');
									}
									if(!color.percent.is([100,100,100,100])){
										delete newFilter.feColorMatrix.(@result.toString()=='colorEffect_percent');
									}
									defs.appendChild(newFilter);
									filter=newFilter;
								}
							}
						}else{
							delete xml.@filter;
						}
					}
				}
			}
			if(color){
				var painted=false;
				var paintProperties=[
					'fill',
					'stroke'
				];
				for(var i=0;i<paintProperties.length;i++){
					if(xml['@'+paintProperties[i]].length()){
						painted=true;
						var paintStr=String(xml['@'+paintProperties[i]]);
						var paintID=paintStr.match(/(?:url\(#)(.*?)(?:\))/);
						if(paintID && paintID.length>1){
							paintID=paintID[1];
							var paint=defs.*.(@id.toString()==paintID);
							if(paint && paint.length()){
								for each(var stop in paint[0].stop){
									var stopColor=new ext.Color(
										String(stop['@stop-color'])
									);
									if(stop['@stop-opacity'].length()){
										stopColor.amount[3]=Number(stop['@stop-opacity'])*255;
									}else{
										stopColor.amount[3]=255;
									}
									var newColor=color.transform(stopColor);
									stop['@stop-color']=newColor.hex;
									stop['@stop-opacity']=newColor.opacity;
								}
							}
						}else if(paintStr[0]=='#'){
							var newColor=new ext.Color(paintStr);
							if(xml['@'+paintProperties[i]+'-opacity'].length()){
								newColor.amount[3]=Number(xml['@'+paintProperties[i]+'-opacity'])*255;
							}else{
								newColor.amount[3]=255;
							}
							newColor=color.transform(newColor);
							xml['@'+paintProperties[i]]=newColor.hex;
							xml['@'+paintProperties[i]+'-opacity']=newColor.opacity;
						}
					}
				}
			}
			if(this.applyColorEffects){
				for each(var element in xml.*){
					this._applyColorEffects(element,defs,color);
				}
			}
			if(ext.log){
				ext.log.pauseTimer(timer);
			}
		},
		_colorFromEffect:function(filter){
			var matrixFilter = filter.feColorMatrix[0];
			if(matrixFilter && matrixFilter..animate.length()==0){
				var mat = matrixFilter.@values.toString().split(" ");
				var color = new ext.Color();
				color.amount[0] = parseFloat(mat[4]) * 0xff;
				color.amount[1] = parseFloat(mat[9]) * 0xff;
				color.amount[2] = parseFloat(mat[14]) * 0xff;
				color.amount[3] = parseFloat(mat[19]) * 0xff;
				color.percent[0] = parseFloat(mat[0]) * 100;
				color.percent[1] = parseFloat(mat[6]) * 100;
				color.percent[2] = parseFloat(mat[12]) * 100;
				color.percent[3] = parseFloat(mat[18]) * 100;
				return color;
			}

			var compFilter = filter.feComponentTransfer[0];
			if(compFilter && compFilter..animate.length()==0){
				var color = new ext.Color();
				if(compFilter.feFuncR.length()){
					color.amount[0] = parseFloat(compFilter.feFuncR.@intercept) * 0xff;
					color.percent[0] = parseFloat(compFilter.feFuncR.@slope) * 100;
				}
				if(compFilter.feFuncR.length()){
					color.amount[1] = parseFloat(compFilter.feFuncG.@intercept) * 0xff;
					color.percent[1] = parseFloat(compFilter.feFuncG.@slope) * 100;
				}
				if(compFilter.feFuncR.length()){
					color.amount[2] = parseFloat(compFilter.feFuncB.@intercept) * 0xff;
					color.percent[2] = parseFloat(compFilter.feFuncB.@slope) * 100;
				}
				if(compFilter.feFuncR.length()){
					color.amount[3] = parseFloat(compFilter.feFuncA.@intercept) * 0xff;
					color.percent[3] = parseFloat(compFilter.feFuncA.@slope) * 100;
				}
				return color;
			}
		},
		_transformFilter:function(matrix,element,defs){
			defs=defs||element.defs;
			if(!defs){
				return;
			}
			var sx=matrix.scaleX;
			var sy=matrix.scaleY;
			if(sx==1 && sy==1)return;

			if(element.@filter.length()){
				var filterID=String(
					element.@filter
				).match(
					/(?:url\(#)(.*?)(?:\))/
				);
				if(
					filterID &&
					filterID.length>1
				){
					var filter=defs.filter.(@id.toString()==filterID[1]);
					if(filter && filter.length()){
						for each(var primitive in filter[0].*){
							switch(primitive.localName()){
								case "feGaussianBlur":
									var blur=new ext.Point(String(primitive.@stdDeviation));
									primitive.@stdDeviation=[
										blur.x*sx,
										blur.y*sy
									].join(' ');
									break;
							}
						}
						if(sx!=1){
							var x=parseFloat(filter.@x);
							var width=parseFloat(filter.@width);
							filter.@x=String(x/(1-sx))+'%';
							filter.@width=String(100+(width-100)/(1-sx))+'%';
						}
						if(sy!=1){
							var y=parseFloat(filter.@y);
							var height=parseFloat(filter.@height);
							filter.@y=String(y/(1-sy))+'%';
							filter.@height=String(100+(height-100)/(1-sy))+'%';
						}
					}							
				}
			}
		},

		/*
			If multiple symbols have identical contents, we combine them into one
			node here.
		*/
		doReuseSymbols:function(timelineIndex, symbolIndex, map){
			if(!map){
				map = {};
			}
			var symbolList = this._symbolLists[timelineIndex];
			if(symbolList.length){
				var symbol = symbolList[symbolIndex];
				if(symbol.parent()){
					var symbolCopy = symbol.copy();
					delete symbolCopy.@id;
					var key = symbolCopy.toXMLString().hashCode();
					var existing = map[key];
					if(existing){
						var useNodes = this._useNodeMaps[timelineIndex][symbol.@id.toString()];
						if(useNodes){
							delete symbol.parent().children()[symbol.childIndex()];
							for(var i=0; i<useNodes.length; i++){
								var useNode = useNodes[i];
								useNode['@xlink-href'] = "#"+existing.@id;
							}
						}else{
							fl.trace("\nCOULDN'T COMBINE: "+symbol.toXMLString());
						}
					}else{
						map[key] = symbol;
					}
				}
			}

			if(symbolIndex>=symbolList.length-1){
				if(timelineIndex==this._symbolLists.length-1){
					return; // next state
				}else{
					this.qData.unshift(closure(this.doReuseSymbols, [timelineIndex+1, 0], this));
				}
			}else{
				this.qData.unshift(closure(this.doReuseSymbols, [timelineIndex, symbolIndex+1, map], this));
			}
		},

		/*
			If multiple frames in the same layer have identical contents, we combine them into one
			node here.
		*/
		doReuseFrames:function(listIndex, frameIndex, cache){
			if(!this._layerCacheLists.length)return;

			var list = this._layerCacheLists[listIndex];

			if(!cache){
				cache = {};
			}

			var frameNode = list[frameIndex];
			var frameCopy = frameNode.copy();
			delete frameCopy.animate;
			delete frameCopy.@style;
			delete frameCopy.@id;

			var idDesc = frameCopy.descendants().(['@id']);
			for(var i=0; i<idDesc.length(); ++i){
				delete idDesc.@id;
			}
			var key = frameCopy.toXMLString().hashCode();
			var cached = cache[key];
			if(cached){
				if(cached.@style.length() && !frameNode.@style.length()){
					delete cached.@style;
				}
				var anim1 = cached.animate;
				var anim2 = frameNode.animate;
				var times1 = anim1.@keyTimes.toString().split(";");
				var times2 = anim2.@keyTimes.toString().split(";");
				var values1 = anim1.@values.toString().split(";");
				var values2 = anim2.@values.toString().split(";");

				var i=0;
				var j=0;
				var time2;
				var lastWasOn = false;
				while( j<times1.length ){
					var time = times1[j];
					var value = values1[j]=="inline";
					if(lastWasOn && !value){
						times1.splice(j, 1);
						values1.splice(j, 1);
						continue;
					}
					var skip = 0;

					while((time2 = times2[i]) < time ){
						if(!value){
							var value2 = values2[i];
							if(value2=="inline" || lastWasOn){
								times1.splice(j+skip, 0, time2);
								values1.splice(j+skip, 0, value2);
								lastWasOn = value2=="inline";
								skip++;
							}
						}
						i++;
					}
					j += skip+1;
				}
				anim1.@keyTimes = times1.join(";");
				anim1.@values = values1.join(";");
				delete frameNode.parent().children()[frameNode.childIndex()];
			}else{
				cache[key] = frameNode;
			}

			if(frameIndex==list.length-1){
				if(listIndex==this._layerCacheLists.length-1){
					return; // next state
				}else{
					this.qData.unshift(closure(this.doReuseFrames, [listIndex+1, 0], this));
				}
			}else{
				this.qData.unshift(closure(this.doReuseFrames, [listIndex, frameIndex+1, cache], this));
			}
		}
	};
	ext.extend({SVG:SVG});
})(extensible);



closure = function(meth, args, scope, passArgs){
	if(passArgs){
		return function(){
			var args2 = Array.prototype.slice.call(arguments);
			return meth.apply(scope, args2.concat(args));
		}
	}else{
		return function(){
			return meth.apply(scope, args);
		}
	}
}