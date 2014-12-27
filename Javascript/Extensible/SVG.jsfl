(function(ext){

	function SVG(options){
		fl.outputPanel.clear();

		this.VIEW_BOX_PADDING=50; // Adds gap around viewBox to avoid clipping.

		this.DEFAULT_GRADIENT_LENGTH=819.2; // Pre-transformation length of ALL linear gradients in flash.
		this.DEFAULT_GRADIENT_RADIUS=810.7; // Pre-transformation radius of ALL radial gradients in flash.
		this.DEFAULT_BITMAP_SCALE=1/20;
		this.MAX_INLINE_CALL_COUNT=2999; // Max recursions
		this.IDENTITY_MATRIX='matrix(1 0 0 1 0 0)';
		this.NO_TWEEN_SPLINE='.1 .1 .9 .9';
		this.DOCUMENT_DATA='SVGExportOptions';
		this.MODULO_STAND_IN='.__';

		// Processing states
		this.STATE_PRE_INIT = 0;
		this.STATE_TIMELINES = 1;
		this.STATE_ELEMENT_READING = 2;
		this.STATE_DELETE_EXISTING_FILES = 3;
		this.STATE_EXPANDING_USE_NODES = 4;
		this.STATE_REMOVING_UNUSED_SYMBOLS = 5;
		this.STATE_SIMPLIFYING_FRAMES = 6;
		this.STATE_FINALISING_FILES = 7;
		this.STATE_CLEANUP = 8;
		this.STATE_DONE = 9;

		var settings=new ext.Object({
			file:undefined,
			decimalPointPrecision:3,
			expandSymbols:'usedOnce', // 'nested', 'all', 'none', usedOnce
			rendering:'auto', // 'auto', 'optimizeSpeed', 'optimizeQuality', 'inherit'
			convertPatternsToSymbols:true,
			applyTransformations:true,
			applyColorEffects:false,
			flattenMotion:true,
			curveDegree:3,
			maskingType:'clipping',
			frames:'all', // 'custom', 'all', 'current'
			startFrame:undefined,
			endFrame:undefined,
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
			log:ext.doc.pathURI.stripExtension()+'.log.csv', // debugging log
			traceLog:false,
			source:'current',// 'current', 'libraryItems'
			output: 'animation',// 'animation', 'images'
			clipToScalingGrid:false, // only relevant when source=='Selected Library Items'
			clipToBoundingBox:false, // only relevant when source=='Selected Library Items'
			beginAnimation:"0s",
			repeatCount:"indefinite",
			nonAnimatingShow:"start",
			loopTweens:true,
			discreteEasing:true,
			removeGroups:true,
			compactOutput:true,
			avoidMiter:true
		});
		if(options instanceof XML || typeof(options)=='string'){
			ext.Task.apply(this,[settings]);
			this.loadSettings(options);
		}else{
			settings.extend(options);
			ext.Task.apply(this,[settings]);
		}
		if(!options && ext.doc.documentHasData(this.DOCUMENT_DATA)
		){
			this.settingsXML=this.loadSettings(ext.doc.getDataFromDocument(this.DOCUMENT_DATA));
		}
		if(
			this.file &&
			!/^file\:/.test(this.file)
		){
			this.file = this.file.absoluteURI(ext.doc.pathURI.dir);			
		}
		var extIndex = this.file.indexOf(".svg");
		if(extIndex==this.file.length - 4){
			this.file = this.file.substr(0, this.file.length - 4);
		}

		var timeline;
		if(this.frames=='current'){
			this.frames=new ext.Array([]);
			if(this.source=='current'){
				this.startFrame=ext.frame;
				this.endFrame=ext.frame;
			}else{
				this.startFrame=0;
				this.endFrame=1;
			}
		}else if(this.frames=='all'){
			this.startFrame=0;

			if(this.source=='current'){
				this.endFrame = ext.timeline.$.frameCount-1;
			}else if(this.source=='libraryItems'){
				this.endFrame=0;
				for(var i=0;i<selectedItems.length;i++){
					timeline=selectedItems[i].timeline;
					if(timeline.$.frameCount-1>this.endFrame){
						this.endFrame = timeline.$.frameCount-1;
					}
				}
			}
		}
		if(this.repeatCount==true)this.repeatCount = "indefinite";
		else if(this.repeatCount==false)this.repeatCount = "1";

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
			this.curveDegree=['','','Quadratic','Cubic'].indexOf(this.curveDegree);
		}
		this.swfPanel=ext.swfPanel(this.swfPanelName); // the swfPanel
		this._timer=undefined;
		//this._symbolToUseNodes={};
		this._bitmaps={};
		//this._rootItem={};
		this._tempFolder=ext.lib.uniqueName('temp'); // Library folder holding temporary symbols.
		this._origSelection=new ext.Selection([]);
		this._delayedProcessing=true;// If true, a timeline is processed one level deep in it's entirety before progressing to descendants.
		this.currentState=0;

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
			for(var i=this.startFrame; i<this.endFrame+1; i++){
				this.frames.push(i);
			}
		}
		if(!this.frames.length){
			this.frames.push(ext.frame);
		}
		if(this.source=='current'){
			timeline={
				timeline:ext.timeline,
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
			this.doState();
		},
		end:function(){
			this.currentState = STATE_DONE;
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
				case this.STATE_EXPANDING_USE_NODES:
					this.qData.push(closure(this.processExpandUseNodes, [], this));
					break;
				case this.STATE_REMOVING_UNUSED_SYMBOLS:
					//this.qData.push(closure(this.processRemoveUnused, [], this));
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
					return true;
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
					//selection:this.selection,
					libraryItem:timeline.libraryItem,
					isRoot:true,
					flattenMotion:this.flattenMotion,
					beginAnimation:this.beginAnimation,
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
			if(element.localName()=="use" && (id = element['@xlink-href'])){
				var allUseNodes = root..use;
				var useList = [];
				for(var i=0; i<allUseNodes.length(); i++){
					var node = allUseNodes[i];
					if(node['@xlink-href']==id){
						useList.push(node);
					}
				}

				//fl.trace("Ex: "+id+" "+useList.length);
				var symbol=defs.symbol.("#"+@id==id);
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
				this._applyColorEffects(document,document.defs);
				this._deleteUnusedFilters(document);
				document['@xmlns']="http://www.w3.org/2000/svg";

				var trans = document.@transform;
				if(trans.length()){
					// transform doesn't work on the root node, so transfer it to it's children
					var transMat = new ext.Matrix(trans);
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
				document['@viewBox']=String(this.x)+' '+String(this.y)+' '+String(this.width)+' '+String(this.height);
				document.@width = this.width;
				document.@height = this.height;

				if(this.includeBackground){
					document['@enable-background']='new '+document['@viewBox'];
				}
				var outputObject = {};
				outputObject.string= this.docString + document.toXMLString();
				if(this.compactOutput){
					outputObject.string = outputObject.string.split("  ").join("");
					outputObject.string = outputObject.string.split("\n").join("");
					// Some older versions of Chrome (and possibly others) have a bug that requires a newline before closing the symbol tag
					outputObject.string = outputObject.string.split("</symbol>").join("\n</symbol>");
				}
				outputObject.id = document.@id;

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

				var symbol=defs.symbol.(@id==id);

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
					delete useNode['@width'];
					delete useNode['@height'];
					delete useNode['@x'];
					delete useNode['@y'];
					this.copyNodeContents(useNode, symbol);
					delete useNode['@id'];
					delete symbol['@viewBox'];
					delete symbol['@overflow'];

					if(useNode.@transform && useNode.@transform!=this.IDENTITY_MATRIX)symbol.@transform = useNode.@transform;
					delete useNode.parent().children()[useNode.childIndex()];

					useNode = symbol;

					doRemove = false;
				}else{
					var symCopy = symbol[0].copy();
					this.copyNodeContents(symCopy, useNode);
					useNode.setName('g');
					//useNode['@id']=this._uniqueID(String(symbol['@id'])+'_1');
					delete useNode['@xlink-href'];
					delete useNode['@width'];
					delete useNode['@height'];
					delete useNode['@x'];
					delete useNode['@y'];
					delete useNode['@viewBox'];
					delete useNode['@overflow'];
					if(useNode['@transform']==this.IDENTITY_MATRIX){
						delete useNode['@transform'];
					}
					for each(var node in useNode..*){
						if(node.hasOwnProperty('@id') && node.localName()!='mask'){
							node.@id=this._uniqueID(String(node.@id));
						}
						if(node.hasOwnProperty('@mask')){
							var oldID=String(node.@mask).match(/(?:url\(#)(.*?)(?:\))/);
							if(oldID && oldID.length>1){
								var newID=this._uniqueID(oldID[1]);
								var old=useNode.(@id==oldID[1]);
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
									var origDef=defs.*.(@id==ida[1]);
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
				//var list = dom..g.(@id==id);
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
				return symbol;
			}
			return result;
		},

		_getBoundingBox:function(items){
			var ret;
			for(var i=0; i<items.length; ++i){
				var item = items[i];
				if(item.right - item.left > 0 && item.bottom - item.top > 0){
					if(ret==null){
						ret = {left:item.left, right:item.right, top:item.top, bottom:item.bottom};
					}else{
						if(ret.left>item.left)ret.left = item.left;
						if(ret.top>item.top)ret.top = item.top;
						if(ret.right<item.right)ret.right = item.right;
						if(ret.bottom<item.bottom)ret.bottom = item.bottom;
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
			var settings=new ext.Object({
				startFrame:0,
				endFrame:this.frames.length,
				includeShapeTweens:true,
				includeMotionTweens:true,
				includeHiddenLayers:ext.includeHiddenLayers,
				includeGuides:false,
				includeGuidedTweens:false,
				includeGraphicChanges:false
			});
			settings.extend(options);
			var f=new ext.Array();
			var layers=settings.timeline.$.layers;
			for(var l=0;l<layers.length;l++){
				var layer = layers[l];
				if(
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
							return true;
						}
						if(settings.includeGraphicChanges && frame.duration>1){
							var elems = frame.elements;
							for(var j=0; j<elems.length; ++j){
								var elem = elems[j];
								if(elem.symbolType=="graphic" && elem.loop!="single frame"){
									return true;
								}
							}
						}
					}
				}
			}
			return false;	
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
				timeOffset:0
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

			var symbolIDString = timelineName.split("/").join("_");
			if(settings.color){
				symbolIDString += '_'+settings.color.idString; //should factor this out and use a transform
			}
			if(frameCount>1){
				var dur = settings.totalDuration * ext.doc.frameRate;
				var offset = settings.timeOffset * ext.doc.frameRate;
				if(settings.frameCount==1){
					symbolIDString += '_f'+settings.startFrame;
				}else if(settings.timeOffset!=null && settings.timeOffset>0){
					symbolIDString += '_t'+Math.round(settings.timeOffset * Math.pow(10, this.decimalPointPrecision));
				}
			}
			var isNew,boundingBox;
			if(this._symbols[symbolIDString]){
				isNew=false;
				xml = this._symbols[symbolIDString];
				id = xml.@id;
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
						includeGraphicChanges:true
					});



				// deselect all
				if(ext.log){
					var timer2=ext.log.startTimer('extensible.SVG._getTimeline() >> Deselect all');	
				}
				if(settings.libraryItem)ext.doc.library.editItem(settings.libraryItem.name);
				timeline.setSelectedFrames(0, timeline.frameCount-1, true);
				timeline.setSelectedFrames(0,0);
				ext.doc.selectNone();
				if(settings.libraryItem)ext.doc.exitEditMode();
				if(ext.log){
					ext.log.pauseTimer(timer2);
				}

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
			//ext.message("getTimeline: "+symbolIDString+" "+settings.startFrame+" "+settings.endFrame+" "+settings.frameCount+" "+isNew+" "+settings.timeOffset+" "+layers.length);
			//var instanceID = this._uniqueID(id);
			instanceXML=new XML('<use xlink-href="#'+id+'" />');
			if(isNew){
				instanceXML['@width']=0;
				instanceXML['@height']=0;
				instanceXML['@x']=0;
				instanceXML['@y']=0;
				instanceXML['@overflow']="visible";

				xml=new XML('<symbol/>');
				xml['@id']=id;

				if(!settings.isRoot){
					this._symbols[symbolIDString] = xml;
					//this._symbolToUseNodes[symbolIDString] = [instanceXML];
				}

				var forceDiscrete = settings.flattenMotion && settings.discreteEasing;

				if(this.animated){
					var totFrames = (settings.endFrame - settings.startFrame);

					var animNode = <animate
								      attributeName="display"/>;

					if(settings.beginAnimation!="0s")animNode.@begin = settings.beginAnimation;
					animNode.@repeatCount = settings.repeatCount;


					/*var animDur = totFrames*(1/ext.doc.frameRate);
					if(settings.totalDuration<animDur){
						animDur = settings.totalDuration;
					}
					animDur = Math.roundTo(animDur,this.decimalPointPrecision);*/

					if(settings.totalDuration!=null){
						animDur = settings.totalDuration;
					}else{
						/*if(this.repeatCount=="indefinite"){
							// when looping, we behave as if the timeline is 1 frame shorter so the last KF acts as an end-point (making for seemless loops)
							animDur = this.precision((totFrames-1)*(1/ext.doc.frameRate));
						}else{*/
							animDur = this.precision(totFrames / ext.doc.frameRate);
						//}
					}

					animNode.@dur = this.precision(animDur)+"s";
				}else{
					animDur = 0;
				}
				var animatedFrames = {};

				var lastFrameTime = this.precision((settings.timeOffset + (settings.endFrame - settings.startFrame)*(1/ext.doc.frameRate))/animDur);
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


					var colorX=null;
					var isMask = false;
					var isMasked = false;
					if(layer.layerType=='mask'){
						isMask = true;
						if(this.maskingType=='alpha'){
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
					while( n<layerEnd ){
						if(ext.log){
							var timer2=ext.log.startTimer('extensible.SVG._getTimeline() >> Get frame items');	
						}
						var frame = new ext.Frame(frames[n]);
						var tweenType = frame.tweenType;

						var items = this._getItemsByFrame(frame, settings.selection);
						if(items.length==0){
							n++;
							continue;
						}
						var itemBounds = this._getBoundingBox(items);
						if(boundingBox.left>itemBounds.left)boundingBox.left = itemBounds.left;
						if(boundingBox.top>itemBounds.top)boundingBox.top = itemBounds.top;
						if(boundingBox.right<itemBounds.right)boundingBox.right = itemBounds.right;
						if(boundingBox.bottom<itemBounds.bottom)boundingBox.bottom = itemBounds.bottom;

						var frameXML;
						var startType = layer.frames[frame.startFrame].tweenType;
						if(this.animated && (animatedFrames[i+"-"+n] || (frame.startFrame!=n && n!=settings.startFrame && (startType=='none' || (!settings.flattenMotion && startType=="motion"))))){
							// Skip frames that haven't changed or are motion tweens (when in animation mode).
							n++;
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
							while(frameEnd<layerEnd){
								var nextFrame = layer.frames[frameEnd];
								if(nextFrame){
									if(nextFrame.startFrame==frameEnd){
										// keyframe
										var nextElem = nextFrame.elements[0];
										if(nextFrame.elements.length!=1 ||
											(nextElem.libraryItem!=mainElem.libraryItem && (lastFrame.startFrame==frameEnd-1 || lastFrame.tweenType=='none'))){ // tweening to a different symbol with no frames between, do not tween
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
							if(ext.log){
								ext.log.pauseTimer(timer2);
							}
						}else if(tweenType=='none'){
							while(frameEnd<layer.frames.length && layer.frames[frameEnd].startFrame==n){
								frameEnd++;
								// this will add in extra time for frames with non changing content (which won't be included as a real frame)
							}
						}

						for(var j=0; j<items.length; ++j){
							var element = items[j];
							element.timeline = timeline;
							//var elementID=this._uniqueID('element');

							var time = settings.timeOffset + (n - settings.startFrame) / ext.doc.frameRate;
							var elemSettings = {
										frame:n,
										dom:dom,
										timeOffset:time,
										frameCount:(frameEnd - n),
										totalDuration:animDur,
										beginAnimation:"0s",
										repeatCount:settings.repeatCount,
										loopTweens:this.loopTweens,
										discreteEasing:this.discreteEasing,
										flattenMotion:settings.flattenMotion
									};

							if(element.elementType=="shape"){
								elemSettings.lookupName = timelineName+"_"+i+"."+frame.startFrame+(items.length>1?"."+j:"");

							}else if(element.symbolType=="graphic"){
								elemSettings.frameCount = 1;
								var childFrame = element.firstFrame;
								if(element.loop!="single frame")childFrame += (n - frame.startFrame);
								/*if(element.loop=="loop"){
									elemSettings.timeOffset = 0;
									elemSettings.totalDuration = element.timeline.frameCount / ext.doc.frameRate;
								}*/
								elemSettings.startFrame = this._getPriorFrame(element.timeline, childFrame);

							}else if(element.symbolType=="movie clip"){
								if(elemSettings.timeOffset==0 || element.libraryItem.timeline.frameCount<(frameEnd-n) && frameEnd>n+1){
									elemSettings.beginAnimation = this.precision(elemSettings.timeOffset)+"s";
									elemSettings.timeOffset = 0;
									elemSettings.frameCount = element.libraryItem.timeline.frameCount;
									elemSettings.totalDuration = elemSettings.frameCount / ext.doc.frameRate;
								}
								elemSettings.repeatCount = settings.repeatCount;
							}

							if(!elemSettings.lookupName || !this._symbols[elemSettings.lookupName]){
								if(this._delayedProcessing){
									var elementXML = new XML( elemSettings.lookupName ? '<symbol/>' : '<g/>' );
									this.qData.push(closure(this.processElement, [elementXML, element, elemSettings, dom], this));
								}else{
									var elementXML = this._getElement( element, elemSettings );
								}
							}else{
								var elementXML = null;
							}
							
							
							if(elemSettings.lookupName){
								var symbol = this._symbols[elemSettings.lookupName];
								if(elementXML){
									this._symbols[elemSettings.lookupName] = elementXML;
									dom.defs.appendChild(elementXML);
								}
								frameXML.appendChild( new XML('<use xlink-href="#'+elemSettings.lookupName+'" />') );
							}else if(elementXML){
								frameXML.appendChild(elementXML);
							}
							
						}

						if(doAnim){
							
							if(doCollateFrames){
								if(ext.log){
									var timer2=ext.log.startTimer('extensible.SVG._getTimeline() >> Get keyframes');	
								}


								var xList = [];
								var yList = [];
								var scxList = [];
								var scyList = [];
								var skxList = [];
								var skyList = [];
								var rotList = [];
								var trxList = [];
								var tryList = [];
								var alphaList = [];

								var timeList = [];
								var splineList = [];

								// skewX scale lists
								var skxScaleXList = [];
								var skxScaleYList = [];
								var skxTimeList = [];
								var skxSplineList = [];

								// skewY scale lists
								var skyScaleXList = [];
								var skyScaleYList = [];
								var skyTimeList = [];
								var skySplineList = [];

								var transXList = [];
								var transYList = [];

								var tweensFound = (frame.tweenType!="none" && frame.duration>1);

								var matrix;
								/*var invMatrix;
								var firstRot;
								var firstScX;
								var firstScY;
								var firstSkX;
								var firstSkY;*/
								var allowRotateList = [];
								var lastElement;
								for(var nextInd = n; nextInd<frameEnd; ++nextInd){
									var nextFrame = layer.frames[nextInd];
									if(nextFrame.startFrame!=nextInd)continue;
									var nextElement = nextFrame.elements[0];
									if(lastElement){
										allowRotateList.push(/*!isNaN(nextElement.rotation) || */(nextElement.skewX > nextElement.skewY) == (lastElement.skewX > lastElement.skewY));
										//fl.trace(">>>>\n"+lastElement.rotation+" "+lastElement.skewX+" "+lastElement.skewY+" "+(lastElement.skewX - lastElement.skewY)+"\n"+nextElement.rotation+" "+nextElement.skewX+" "+nextElement.skewY+" "+(nextElement.skewX - nextElement.skewY));
									}
									lastElement = nextElement;
								}
								allowRotateList.push(allowRotateList[allowRotateList.length-1]);
								if(this.showEndFrame){
									matrix = new ext.Matrix(lastElement.matrix);
								}else{
									nextElement = element;
									matrix = element.matrix.clone();
								}
								/*firstSkX = nextElement.skewX;
								firstSkY = nextElement.skewY;
								firstScX = nextElement.scaleX;
								firstScY = nextElement.scaleY;
								firstRot = this._getRotation(nextElement);
								if(isNaN(firstRot))firstRot = 0;

								var transPoint = nextElement.getTransformationPoint();
								//if(firstRot)matrix = this.rotateMatrix(matrix, firstRot, Math.sin(firstRot), Math.cos(firstRot), transPoint);
								var invMatrix = matrix.invert();
								//invMatrix.tx -= transPoint.x;
								//invMatrix.ty -= transPoint.y;*/
								var invMatrix = new ext.Matrix();
								var firstRot = 0;
								var firstScX = 0;
								var firstScY = 0;
								var firstSkX = 0;
								var firstSkY = 0;


								var time = settings.timeOffset+(n/ext.doc.frameRate)/animDur;
								
								var lastRot = 0;
								var lastFrame = frame;
								var autoRotate = 0;
								var lastSkX = null;
								var lastSkY = null;
								var lastTime;

								var mainElem = frame.elements[0];
								var loopAnim = (settings.loopTweens && n==settings.startFrame && frameEnd==settings.endFrame && settings.repeatCount=="indefinite" && layer.frames[frameEnd-1].startFrame==frameEnd-1);
								var addTweenKiller = false;
								var keyframeI = 0;
								for(var nextInd = n/*+1*/; nextInd<frameEnd; ++nextInd){
									var nextFrame = layer.frames[nextInd];
									if(nextFrame.startFrame!=nextInd)continue;

									var allowSkewRot = allowRotateList[keyframeI];
									keyframeI++;

									var attemptForeRot = true;
									var attemptBackRot = true;
									var time = (settings.timeOffset+nextInd/ext.doc.frameRate)/animDur;
									var isLast = (nextFrame.duration + nextInd >= frameEnd);
									if(addTweenKiller){
										var smallT = this.precision(time-1/Math.pow(10, this.decimalPointPrecision));
										timeList.push(smallT);
									}else if(lastFrame.tweenType=="motion"){
										tweensFound = true;
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
									var skewX = nextElement.skewX - firstSkX;
									var skewY = nextElement.skewY - firstSkY;

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
									skewX -= rot;
									skewY -= rot;
			 						//fl.trace("\nframe: "+nextFrame.startFrame);
									addTweenKiller = (nextFrame.tweenType=="none" && (!loopAnim || !isLast));
									var transPoint = nextElement.getTransformationPoint();
									this.checkSkewQuadrant(skewX, time, lastSkX, lastTime, skxScaleYList, skxScaleXList, skxTimeList, skxSplineList, transPoint.x, transPoint.y)
									this.checkSkewQuadrant(skewY, time, lastSkY, lastTime, skyScaleXList, skyScaleYList, skyTimeList, skySplineList, transPoint.y, transPoint.x)
									this._addAnimFrame(nextFrame, nextElement, invMatrix, time, rot, skewX, skewY, autoRotate, xList, yList, transXList, transYList, scxList, scyList, skxList, skyList, rotList, trxList, tryList, alphaList, timeList, splineList, addTweenKiller, i, nextInd);
									
									lastFrame = nextFrame;
									lastRot = rot;
									lastSkX = skewX;
									lastSkY = skewY;
									lastTime = time;

									if(!transToDiff || nextInd<frameEnd-1)animatedFrames[i+"-"+nextInd] = true;
									if(nextFrame.elements.length>1 || nextElement.libraryItem!=element.libraryItem)break;
								}
								if(addTweenKiller || loopAnim){
									var t = (settings.timeOffset+nextInd/ext.doc.frameRate)/animDur;
									timeList.push(t);
									if(loopAnim){
										skxTimeList.push(t);
										skyTimeList.push(t);

										if(settings.loopTweens){
											if(splineList[splineList.length-1]==this.NO_TWEEN_SPLINE) splineList[splineList.length-1] = splineList[0];
											if(skxTimeList[skxTimeList.length-1]==this.NO_TWEEN_SPLINE) skxTimeList[skxTimeList.length-1] = skxTimeList[0];
											if(skySplineList[skySplineList.length-1]==this.NO_TWEEN_SPLINE) skySplineList[skySplineList.length-1] = skySplineList[0];
										}
										// this code joins the end of the animation up with the start for seemless looping
										xList.push(xList[0]);
										yList.push(yList[0]);
										scxList.push(scxList[0]);
										scyList.push(scyList[0]);
										skxList.push(skxList[0]);
										skyList.push(skyList[0]);
										rotList.push(rotList[0]);
										trxList.push(trxList[0]);
										tryList.push(tryList[0]);
										alphaList.push(alphaList[0]);
										splineList.push(splineList[0]);
										transXList.push(transXList[0]);
										transYList.push(transYList[0]);

										skxScaleXList.push(skxScaleXList[0]);
										skxScaleYList.push(skxScaleYList[0]);
										skyScaleXList.push(skyScaleXList[0]);
										skyScaleYList.push(skyScaleYList[0]);

										skxSplineList.push(skxSplineList[0]);
										skySplineList.push(skySplineList[0]);
									}
								}
								var combineSkewScales = false;
								if(skxTimeList.length == skyTimeList.length){
									combineSkewScales = true;
									for(var p=0; p<skxTimeList.length; p++){
										if(skxTimeList[p]!=skyTimeList[p]){
											combineSkewScales = false;
											break;
										}
									}
								}
								if(this.hasDifferent(xList, yList, rotList, skyList, skxList, scxList, scyList)){
									// the ordering of these animation nodes is important
									this._addAnimationNode(elementXML, "translate", [xList, yList], timeList, animDur, splineList, tweensFound, null, settings.beginAnimation, settings.repeatCount, forceDiscrete)
									this._addAnimationNode(elementXML, "rotate", [rotList, trxList, tryList], timeList, animDur, splineList, tweensFound, null, settings.beginAnimation, settings.repeatCount, forceDiscrete, false)
									this._addAnimationNode(elementXML, "skewX", [skxList], timeList, animDur, splineList, tweensFound, null, settings.beginAnimation, settings.repeatCount, forceDiscrete)
									this._addAnimationNode(elementXML, "skewY", [skyList], timeList, animDur, splineList, tweensFound, null, settings.beginAnimation, settings.repeatCount, forceDiscrete)
									this._addAnimationNode(elementXML, "scale", [scxList, scyList], timeList, animDur, splineList, tweensFound, 1, settings.beginAnimation, settings.repeatCount, forceDiscrete, true)
									if(combineSkewScales){
										this._addAnimationNode(elementXML, "scale", [skyScaleXList, skxScaleYList], skxTimeList, animDur, skxSplineList, tweensFound, 1, settings.beginAnimation, settings.repeatCount, forceDiscrete, true)
									}else{
										this._addAnimationNode(elementXML, "scale", [skxScaleXList, skxScaleYList], skxTimeList, animDur, skxSplineList, tweensFound, 1, settings.beginAnimation, settings.repeatCount, forceDiscrete, true)
										this._addAnimationNode(elementXML, "scale", [skyScaleXList, skyScaleYList], skyTimeList, animDur, skySplineList, tweensFound, 1, settings.beginAnimation, settings.repeatCount, forceDiscrete, true)
									}
									this._addAnimationNode(elementXML, "translate", [transXList, transYList], timeList, animDur, splineList, tweensFound, null, settings.beginAnimation, settings.repeatCount, forceDiscrete)
								}
								
								if(this.hasDifferent(alphaList))this._addAnimationNode(elementXML, "opacity", [alphaList], timeList, animDur, splineList, tweensFound, 1, settings.beginAnimation, settings.repeatCount, forceDiscrete)

								elementXML.@transform = this._getMatrix(matrix);

								if(ext.log){
									ext.log.pauseTimer(timer2);
								}

							}/*else if(tweenType=='none'){
								while(frameEnd<layer.frames.length && layer.frames[frameEnd].startFrame==n){
									frameEnd++;
									// this will add in extra time for frames with non changing content (which won't be included as a real frame)
								}
							}*/

							var lastFrameInd = (transToDiff?frameEnd-1:frameEnd)
							//lastFrameInd    += (lastFrameInd==layerEnd?1:0);

							// use precision before devision because animDur has already been rounded and fractions that should be 1 can end up being 0.999 otherwise
							var frameTimeStart = this.precision(this.precision(settings.timeOffset + (n - settings.startFrame)/ext.doc.frameRate)/animDur);
							var frameTimeEnd = this.precision(this.precision(settings.timeOffset + (lastFrameInd - settings.startFrame)/ext.doc.frameRate)/animDur);

							if(frameTimeStart>1)fl.trace("START TIME WARNING: "+frameTimeStart+" "+settings.timeOffset+" "+animDur+" "+n+" "+settings.startFrame+" "+((n - settings.startFrame)*(1/ext.doc.frameRate)));
							if(frameTimeEnd>1)fl.trace("END TIME WARNING: "+timeline.name+" "+((settings.timeOffset + (lastFrameInd - settings.startFrame)/ext.doc.frameRate) * ext.doc.frameRate)+" / "+(animDur * ext.doc.frameRate)+" = "+frameTimeEnd);


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

						n = transToDiff ? frameEnd-1 : frameEnd;
					}
					if(layer.visible!=lVisible) layer.visible=lVisible;
					if(layer.locked!=lLocked) layer.locked=lLocked;
				}
				if(masked.length){
					// masked layers have ended group
					this._doMask(xml, masked, maskId);
				}
			}else{
				var vb=String(xml['@viewBox']).split(' ');
				instanceXML['@width']=vb[2];
				instanceXML['@height']=vb[3];
				instanceXML['@x']=vb[0];
				instanceXML['@y']=vb[1];
				instanceXML['@overflow']="visible";
				//this._symbolToUseNodes[symbolIDString].push(instanceXML);
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
			var viewBox=(
				String(this.precision(boundingBox.left))+' '+
				String(this.precision(boundingBox.top))+' '+
				String(this.precision(boundingBox.right-boundingBox.left))+' '+
				String(this.precision(boundingBox.bottom-boundingBox.top))
			);
			if(isNew){
				xml['@viewBox'] = viewBox;
			}else if(xml['@viewBox']!=viewBox){
				instanceXML['@viewBox'] = viewBox;
			}
			var trans = this._getMatrix(settings.matrix);
			if(trans==this.IDENTITY_MATRIX)trans = null;

			if(settings.isRoot){
				if(ext.log) ext.log.pauseTimer(timer);
				xml.setName('g');
				
				if(trans) xml['@transform'] = trans;
				delete xml['@xlink-href'];
				return xml;
			}else{
				instanceXML['@width']=String(Math.ceil(boundingBox.right-boundingBox.left));
				instanceXML['@height']=String(Math.ceil(boundingBox.bottom-boundingBox.top));
				instanceXML['@x']=Math.floor(boundingBox.left);
				instanceXML['@y']=Math.floor(boundingBox.top);
				if(boundingBox.left!=instanceXML['@x'] || boundingBox.top!=instanceXML['@y']){
					// if there are rounding errors we add the dif to the transform (greatly scaled objects can be affected dramatically)
					// var offset = settings.matrix.transformPoint(boundingBox.left-instanceXML['@x'], boundingBox.top-instanceXML['@y'], false);
					// settings.matrix.tx += offset.x;
					// settings.matrix.ty += offset.y;

					// not sure if this is really helping, must test more
				}
				if(trans) instanceXML['@transform'] = trans;
				// if(settings.isRoot && settings.libraryItem){
				// 	dom.@viewBox = viewBox;
				// 	dom.@width = instanceXML.@width;
				// 	dom.@height = instanceXML.@height;
				// }

				if(ext.log) ext.log.pauseTimer(timer);
				return instanceXML;
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
				//ext.doc.editScene(ext.doc.timelines.indexOf(timeline.$)+1); // edit new scene (after duplication current scene changes to last scene)

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
			}else{
				return element.rotation;
			}
		},
		_addAnimFrame:function(frame, element, invMatrix, time, rot, skewX, skewY, autoRotate,
								xList, yList, transXList, transYList, scxList, scyList, skxList, skyList, rotList, trxList, tryList, alphaList,
								timeList, splineList,
								addTweenKiller, layerI, frameI){

			if(!isNaN(element.rotation)){
				element.rotation += 0; // sometimes fixes invalid matrices
			}
			var matrix = new ext.Matrix(element.matrix);
			var transPoint = element.getTransformationPoint();

			transXList.push(-transPoint.x);
			transYList.push(-transPoint.y);

			//transPoint = matrix.transformPoint(transPoint.x, transPoint.y, false);
			var outerTransPoint = matrix.transformPoint(transPoint.x, transPoint.y, true);
			xList.push(this.precision(outerTransPoint.x));
			yList.push(this.precision(outerTransPoint.y));

			if(!isNaN(rot) && rot!=0){
				var rotRad = rot / 180 * Math.PI;

				if(isNaN(element.rotation)){
					var spin = Math.abs(element.skewY - element.skewX);
					if((spin > 90 && spin < 270) || (spin < -90 && spin > -270)){
					//if(spin > 180){
						rot = -rot;
						//transPoint.x = -transPoint.x;
						//transPoint.y = -transPoint.y;
					}
				}

				var rotCos = Math.cos(rotRad);
				var rotSin = Math.sin(rotRad);
				matrix = this.rotateMatrix(matrix, rot, rotSin, rotCos, transPoint);
				matrix = new ext.Matrix(fl.Math.concatMatrix(matrix, invMatrix));

				if((matrix.a<0) == (matrix.d<0)){
					rotList.push(this.precision(rot + autoRotate));
				}else{
					rotList.push(this.precision(-rot + autoRotate));
					matrix.a = -matrix.a;
					matrix.d = -matrix.d;
				}
			}else{
				rotList.push(0);
				var rotCos = Math.cos(0);
				var rotSin = Math.sin(0);
				matrix = new ext.Matrix(fl.Math.concatMatrix(matrix, invMatrix));
			}
			//fl.trace("mat: "+matrix);

			var skewXRads = skewX / 180 * Math.PI;
			var skewYRads = skewY / 180 * Math.PI;
			var skewXSin = Math.sin(skewXRads);
			var skewYSin = Math.sin(skewYRads);
			var skewXCos = Math.cos(skewXRads);
			var skewYCos = Math.cos(skewYRads);
			// var transX = (transPoint.x * skewYCos * element.scaleX + transPoint.y * skewXSin * element.scaleY);
			// var transY = (transPoint.y * skewXCos * element.scaleY + transPoint.x * skewYSin * element.scaleX);
			// xList.push(this.precision(matrix.tx + transX));
			// yList.push(this.precision(matrix.ty + transY));
			// fl.trace("Y: "+matrix.ty + " "+transY+" "+yList[yList.length-1]);
			
			// var x = matrix.tx;
			// var y = matrix.ty;
			// xList.push(this.precision(x + (transPoint.x * rotCos + transPoint.y * -rotSin) - transPoint.x));
			// yList.push(this.precision(y + (transPoint.y * rotCos + transPoint.x * rotSin) - transPoint.y));
			// fl.trace("rot: "+element.rotation+" "+element.skewX+" "+element.skewY);
			 //fl.trace("trans: "+transPoint.x+" "+transPoint.y);
			 //fl.trace("otrans: "+element.getTransformationPoint().x+" "+element.getTransformationPoint().y);
			 //fl.trace("matII: "+matrix.invert());
			 //fl.trace("omat: "+new ext.Matrix(element.matrix));
			 //fl.trace("imat: "+invMatrix);
			// fl.trace("x: "+x+" "+(transPoint.x * rotCos)+" "+(transPoint.y * -rotSin)+" "+(-transPoint.x));
			// fl.trace("y: "+y+" "+(transPoint.y * rotCos)+" "+(transPoint.x * rotSin)+" "+(-transPoint.y));

			//fl.trace("C: "+Math.cos(matrix.b)+" "+Math.sin(matrix.b)+" "+Math.cos(matrix.c)+" "+Math.sin(matrix.c));
			//transPoint = element.getTransformationPoint();
			//trxList.push(this.precision(transPoint.x/* * Math.cos(matrix.c) + Math.sin(matrix.c) * transPoint.y*/));
			//tryList.push(this.precision(transPoint.y/* * Math.cos(matrix.b) + Math.sin(matrix.b) * transPoint.x*/));
			trxList.push(0);
			tryList.push(0);

			//scxList.push(this.precision(matrix.a / skewYCos));
			//scyList.push(this.precision(matrix.d / skewXCos));
			//matrix.scale(1/matrix.a, 1/matrix.d);
			scxList.push(this.precision(element.scaleX));
			scyList.push(this.precision(element.scaleY));


			//scxList.push(this.precision(matrix.a * matrix.a + matrix.b * matrix.b));
			//scyList.push(this.precision(matrix.c * matrix.c + matrix.d * matrix.d));

			//skxList.push(this.precision(this._getClosestRotList(-skewX, skxList)));
			//skyList.push(this.precision(this._getClosestRotList( skewY, skyList)));
			/* fl.trace("mat: "+matrix);
			fl.trace("> "+(40 / 180 * Math.PI));
			fl.trace(">> "+matrix.c+" "+(matrix.c * matrix.c));
			var skx = this.precision(matrix.c * 180 / Math.PI);
			//if(matrix.c < 0)skx = -skx;
			fl.trace("skx: "+skx);
			var sky = this.precision(matrix.b * 180 / Math.PI);*/

			/*var px = matrix.transformPoint(0, 1, false);
			var py = matrix.transformPoint(1, 0, false);

			var sky = ((180/Math.PI) * Math.atan2(px.y, px.x) - 90);
			var skx = ((180/Math.PI) * Math.atan2(py.y, py.x));
			fl.trace("skew: "+skx+" "+sky+" "+rot);
			skxList.push(this.precision(skx));
			skyList.push(this.precision(sky));*/

			//if(matrix.d < 0)sky = -sky;
			 skxList.push(this.precision(-skewX));
			 skyList.push(this.precision(skewY));
			//skxList.push(0);
			//if(skewY)skyList.push(this.precision(matrix.c));
			//else skyList.push(0);

			alphaList.push(element.colorAlphaPercent / 100);

			var spline = this._getFrameSpline(frame);
			splineList.push(spline);

			var time = this.precision(time);
			timeList.push(time);

			if(addTweenKiller){
				xList.push(xList[xList.length-1]);
				yList.push(yList[yList.length-1]);
				scxList.push(scxList[scxList.length-1]);
				scyList.push(scyList[scyList.length-1]);
				skxList.push(skxList[skxList.length-1]);
				skyList.push(skyList[skyList.length-1]);
				rotList.push(rotList[rotList.length-1]);
				trxList.push(trxList[trxList.length-1]);
				tryList.push(tryList[tryList.length-1]);
				transXList.push(transXList[transXList.length-1]);
				transYList.push(transYList[transYList.length-1]);
				alphaList.push(alphaList[alphaList.length-1]);
				splineList.push(splineList[splineList.length-1]);
			}
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
		checkSkewQuadrant:function(skew, time, oldSkew, oldTime, scaleList, othScaleList, scaleTimeList, scaleSplineList, transPointDim1, transPointDim2){
			var quad = Math.floor((skew) / 90);
			var oldQuad = Math.floor((oldSkew) / 90);

			if(oldSkew!=null){
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
						var rads = q * Math.PI / 2;
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
						scaleSplineList.push(this._getFractSpline(ease));
					}
				}
			}
			var rads = skew / 180 * Math.PI;
			scaleList.push(this.precision(Math.cos(rads)));
			othScaleList.push(1);
			scaleTimeList.push(this.precision(time));
			scaleSplineList.push(this._getFractSpline(0));

			return diff>0;
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
		_addAnimationNode:function(toNode, type, valueLists, times, totalTime, splineList, tweensFound, defaultValue, beginAnimation, repeatCount, forceDiscrete, validateAllLists){
			if(validateAllLists==null)validateAllLists = true;
			if(defaultValue==null)defaultValue = 0;
			var getValue = function(valueLists, i){
				var ret = valueLists[0][i].toString();
				for(var j=1; j<valueLists.length; ++j){
					ret += ","+valueLists[j][i];
				}
				return ret;
			}
			var found = false;
			var n = (validateAllLists ? valueLists.length : 1);
			for(var i=0; i<n; ++i){
				var list = valueLists[i];
				var firstVal = list[0];
				for(var j=0; j<list.length; ++j){
					var val = list[j];
					/*if(j!=0 && firstVal!=val){
						hasDifVals = true;
					}*/
					if(val!=defaultValue){
						found = true;
						break;
					}
					//if(hasDifVals && found)break;
				}
				if(/*hasDifVals && */found)break;
			}
			if(!found/* || !hasDifVals*/){
				return false;
			}
			var n = splineList.length;
			var hasEasing = false;
			for(var i=0; i<n; ++i){
				if(splineList[i]!=this.NO_TWEEN_SPLINE){
					hasEasing = true;
					break;
				}
			}
			while(times.length>splineList.length){
				// we use this so that scale values can use the short spline list (improves easing)
				splineList.push(splineList[0]);
			}

			var lastVal = getValue(valueLists, 0);
			var lastTime = times[0];

			if(lastTime>0){
				var validV = [lastVal,lastVal];
				var validT = [0,lastTime];
				var validS = ["0 0 1 1", splineList[0]];
			}else{
				var validV = [lastVal];
				var validT = [lastTime];
				var validS = [splineList[0]];
			}

			var endPointMode = false;
			for(var i=1; i<times.length; ++i){
				var newVal = getValue(valueLists, i);
				lastTime = times[i];
				if(lastTime>1)lastTime = 1;

				//var noneTween = (splineList[i]==this.NO_TWEEN_SPLINE);
				if(newVal==lastVal && (endPointMode/* || noneTween*/)){
					if(endPointMode)validT[validT.length-1] = lastTime;
					//if(noneTween)validS[validT.length-1] = this.NO_TWEEN_SPLINE; 
				}else{
					endPointMode = (newVal==lastVal);
					lastVal = newVal;
					validV.push(newVal);
					validT.push(lastTime);
					validS.push(splineList[i]);
				}
			}
			if(validT[validT.length-1]<1){
				if(validV.length==2 && validV[0]==validV[1]){
					validT[1] = 0.9; // reduces unneeded decimal points
				}
				validV.push(lastVal);
				validT.push(1);
			}else{
				validS.pop(); // spline list should be one element shorter than other lists
			}

			if(type=="opacity"){
				var animNode = <animate />;
				animNode.@attributeName = type;
			}else{
				var animNode = <animateTransform
						      attributeName="transform" additive="sum" />;
				animNode.@type = type;
				if(toNode.animateTransform.length()==0)animNode.@additive = "replace";
			}


			if(beginAnimation!="0s")animNode.@begin = beginAnimation;
			if(repeatCount!=1)animNode.@repeatCount = repeatCount;

			animNode.@dur = this.precision(totalTime)+"s";
			animNode.@keyTimes = validT.join(";");
			animNode.@values = validV.join(";");

			if(tweensFound && !forceDiscrete){
				if(hasEasing){
					animNode.@keySplines = validS.join(";");
					animNode.@calcMode="spline";
				}
			}else{
				animNode.@calcMode="discrete";
			}

			toNode.appendChild(animNode);
			return true;
		},
		/**
		 * Gets the spline points for a motion tweened frame.
		 * Spline data is in the format 'x1 y1 x2 y2;' (per frame)
		 */
		_getFrameSpline:function(frame){

			// Tween support warnings, remove these as different tween settings gain support
			if(frame.hasCustomEase)ext.warn('Custom easing is not yet supported (at frame '+frame.startFrame+")");
			if(!frame.useSingleEaseCurve) ext.warn('Per property custom easing is not supported (at frame '+frame.startFrame+")");
			//if(frame.motionTweenRotateTimes!=0) ext.warn('Auto-rotate tweens are not yet supported (at frame '+frame.startFrame+")");

			if(frame.tweenType=="none"){
				return this.NO_TWEEN_SPLINE;
			}
			return this._getFractSpline(frame.tweenEasing/100);
		},
		_getFractSpline:function(fract){
			if(fract==0)return this.NO_TWEEN_SPLINE;

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
		_getItemsByFrame:function(frame,maskList){
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
				libraryItem:instance.libraryItem
			});
			settings.extend(options);
			//ext.message("_getSymbolInstance: "+instance.libraryItem.name+" - loop:"+instance.loop+" frameCount:"+settings.frameCount+" startFrame:"+settings.startFrame);
			var dom = settings.dom;
			//settings.matrix = instance.matrix.concat(settings.matrix);
			settings.matrix = fl.Math.concatMatrix(instance.matrix, settings.matrix);

			var xml = this._getTimeline(instance.timeline, settings);
			var filterID=this._getFilters(instance, xml, options, dom.defs);
			if(filterID && dom.defs.filter.(@id==filterID).length()){
				xml['@filter']='url(#'+filterID+')';
			}

			if(ext.log){
				ext.log.pauseTimer(timer);
			}
			return xml;
		},
		_getFilters:function(element, xml ,options,defs){
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
				) || filters.length
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
				if( ( element?element.colorMode!='none':false ) || settings.color ){
					if( // colorMode "tint"
						color.percent[0]==color.percent[1]==color.percent[2] && 
						color.percent[3]==100 &&
						color.amount[3]==0 &&
						false
					){
						/*
						var tintSrc=src;
						var tintOpacity=1-(color.percent[0]/100);
						var tintColor=new ext.Color(color);
						var tintColor.percent=[100,100,100,100];
						var feFlood=<feFlood id={this._uniqueID('feFlood')} />;
						feFlood['@flood-color']=tintColor.hex;
						feFlood['@flood-opacity']=tintOpacity;
						feColorMatrix['@result']=src="tint_feFlood";
						filter.appendChild(feFlood);
						var feComposite=<feComposite id={this._uniqueID('feComposite')} />;
						feComposite.@operator=atop;
						feComposite.@in=tintSrc;
						feComposite.@in2=src;
						feComposite.@result='tint_feComposite';
						*/
					}else{
						if(	color.percent[0]==100 &&
							color.percent[1]==100 &&
							color.percent[2]==100){

							if(color.percent[3]!=100){
								xml.@opacity = color.percent[3]/100;
							}

						}else{
							feColorMatrix=<feColorMatrix />;
							feColorMatrix.@type="matrix";
							feColorMatrix['@in']=src;
							feColorMatrix.@values=[
								color.percent[0]/100,0,0,0,0,
								0,color.percent[1]/100,0,0,0,
								0,0,color.percent[2]/100,0,0,
								0,0,0,color.percent[3]/100,0
							].join(' ');
							feColorMatrix['@result']=src="colorEffect_percent";
							filter.appendChild(feColorMatrix);
						}
						if(!color.amount.is([0,0,0,0])){
							var feComponentTransfer=<feComponentTransfer />;
							feComponentTransfer['@in']=src;
							feComponentTransfer.@result=src='colorEffect_amount';
							var feFuncR=<feFuncR/>;
							var feFuncG=<feFuncG/>;
							var feFuncB=<feFuncB/>;
							var feFuncA=<feFuncA/>;
							feFuncR.@type=feFuncG.@type=feFuncB.@type=feFuncA.@type="linear";
							feFuncR.@slope=feFuncG.@slope=feFuncB.@slope=feFuncA.@slope=1;
							feFuncR.@intercept=color.amount[0]/255;
							feFuncG.@intercept=color.amount[1]/255;
							feFuncB.@intercept=color.amount[2]/255;
							feFuncA.@intercept=color.amount[3]/255;
							feComponentTransfer.appendChild(feFuncR);
							feComponentTransfer.appendChild(feFuncG);
							feComponentTransfer.appendChild(feFuncB);
							feComponentTransfer.appendChild(feFuncA);
							filter.appendChild(feComponentTransfer);
						}
					}
				}
			}
			if(filter && filterID && filter.*.length()){
				defs.appendChild(filter);
				return filterID;
			}
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
			var bitmapURI=this._bitmaps[item.name];
			if(!bitmapURI){
				/*if(this.timelines.length==1 && (this.timelines[0].frames.length==1 || this.animated)){
					bitmapURI=this.file.dir+'/'+item.name.basename;
				}else{
					bitmapURI=this.file+'/'+item.name;
					if(
						FLfile.exists(this.file) &&
						FLfile.getAttributes(this.file).indexOf("D")<0
					){
						FLfile.remove(this.file);
					}
					if(!FLfile.exists(this.file)){
						FLfile.createFolder(this.file);
					}
				}*/
				bitmapURI=this.file+'/'+item.name;
				var ext=item.sourceFilePath.extension;
				var re=new RegExp('\.'+ext+'$');
				if(!re.test(bitmapURI)){
					bitmapURI+='.'+ext;
				}
				var success,xml;
				if(item.sourceFileExists && item.sourceFileIsCurrent){
					if(!item.sourceFilePath==bitmapURI){
						if(FLfile.exists(bitmapURI)){
							FLfile.remove(bitmapURI);
						}
						success=FLfile.copy(item.sourceFilePath,bitmapURI);
						if(!success){
							FLfile.write(bitmapURI,FLfile.read(item.sourceFilePath));
						}
					}
				}else if(FLfile.exists(bitmapURI)){
					var uniqueFileName=bitmapURI.uniqueFileName;
					item.exportToFile(uniqueFileName);
					var compareStr=FLfile.read(bitmapURI);
					if(FLfile.read(uniqueFileName)==FLfile.read(bitmapURI)){
						FLfile.remove(uniqueFileName);
					}else{
						bitmapURI=uniqueFileName;
					}
				}else{
					item.exportToFile(bitmapURI);	
				}
				bitmapURI=bitmapURI.relativeTo(this.file.dir);
				this._bitmaps[item.name]=bitmapURI;
			}
			return bitmapURI;
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
				for(var i=0; i<pathList.length; i++){
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
							timeOffset:settings.timeOffset,
							frameCount:settings.frameCount,
							//totalDuration:settings.totalDuration,
							beginAnimation:settings.beginAnimation,
							repeatCount:settings.repeatCount,
							loopTweens:this.loopTweens,
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

				if(!settings.filledOnly && e.stroke && e.stroke.style!='noStroke'){
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
				}
				if(filledPath)filledPath.contours.push(cp);

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
			if(cutHole)reverse = !reverse;

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
					holes.push({contour:contour, edgeIDs:edgeIDs, pathStr:pathStr, polygon:polygon});
					if(currPath.stroke){
						polygons.push(polygon);
						pathNodes.push('<path fill="none" '+currPath.stroke +' d="'+pathStr+'"/>\n');
					}
				}else{
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
				//options.matrix=matrix.concat(tempMatrix.invert()).concat(options.matrix);
				options.matrix = fl.Math.concatMatrix(fl.Math.concatMatrix(matrix, tempMatrix.invert()), options.matrix);
				var xml=this._getShape(currentTimeline.layers[tempLayerIndex].elements[0],options);
				currentTimeline.deleteLayer(tempLayerIndex);
				element.removePersistentData(id);
				if(ext.log){
					ext.log.pauseTimer(timer);	
				}
				return xml;
			}
			return xml;
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
		precision:function(num){
			return Math.roundTo(num,this.decimalPointPrecision);
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
			if(xml.hasOwnProperty('@transform')){
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
			if(xml.hasOwnProperty('@filter') && matrix){
				this._transformFilter(matrix,xml,defs);
			}	
			
			for each(var child in (xml.defs.symbol.*+xml.*)){
				var childName=String(child.localName());
				var cid=child.hasOwnProperty('@id')?String(child['@id']):'';
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
				if(child.hasOwnProperty('@filter') && child.localName()!='g'){
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
							var gradient=defs.*.(@id==gradientID);
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
					if(child.hasOwnProperty('@d')){
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
					if(child.hasOwnProperty('@stroke')){
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
			if(!skip && xml.hasOwnProperty('@filter')){
				var filterID=String(xml.@filter).match(/(?:url\(#)(.*?)(?:\))/);
				if(filterID && filterID.length>1){
					filter=defs.filter.(@id==filterID[1]);
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
										delete newFilter.feComponentTransfer.(@result=='colorEffect_amount');
									}
									if(!color.percent.is([100,100,100,100])){
										delete newFilter.feColorMatrix.(@result=='colorEffect_percent');
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
					if(xml.hasOwnProperty('@'+paintProperties[i])){
						painted=true;
						var paintStr=String(xml['@'+paintProperties[i]]);
						var paintID=paintStr.match(/(?:url\(#)(.*?)(?:\))/);
						if(paintID && paintID.length>1){
							paintID=paintID[1];
							var paint=defs.*.(@id==paintID);
							if(paint && paint.length()){
								for each(var stop in paint[0].stop){
									var stopColor=new ext.Color(
										String(stop['@stop-color'])
									);
									if(stop.hasOwnProperty('@stop-opacity')){
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
							if(xml.hasOwnProperty('@'+paintProperties[i]+'-opacity')){
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
			for each(var element in xml.*){
				this._applyColorEffects(element,defs,color);
			}
			if(ext.log){
				ext.log.pauseTimer(timer);
			}
		},
		_colorFromEffect:function(filter){
			var feAmount=filter.feComponentTransfer.(@result=='colorEffect_amount');
			var fePercent=filter.feColorMatrix.(@result=='colorEffect_percent');
			if(!(feAmount.length() || fePercent.length())){
				return;
			}
			var color=new ext.Color([0,0,0,0]);
			var n=0;
			if(feAmount.length()){
				n+=1;
				feAmount=feAmount[feAmount.length()-1];
				if(feAmount.feFuncR.length()){
					if(feAmount.feFuncR.hasOwnProperty('@intercept')){
						color.amount[0]=Number(feAmount.feFuncR.@intercept)*255;
					}
				}
				if(feAmount.feFuncG.length()){
					if(feAmount.feFuncG.hasOwnProperty('@intercept')){
						color.amount[1]=Number(feAmount.feFuncG.@intercept)*255;
					}
				}
				if(feAmount.feFuncB.length()){
					if(feAmount.feFuncB.hasOwnProperty('@intercept')){
						color.amount[2]=Number(feAmount.feFuncB.@intercept)*255;
					}
				}
				if(feAmount.feFuncA.length()){
					if(feAmount.feFuncA.hasOwnProperty('@intercept')){
						color.amount[3]=Number(feAmount.feFuncA.@intercept)*255;
					}
				}
			}
			if(fePercent.length()){
				n+=1;
				fePercent=fePercent[fePercent.length()-1];
				var values=String(fePercent.@values).match(/[\d\.\-]*\d/g);
				if(values.length>16){
					color.percent[0]=values[0]*100;
					color.percent[1]=values[6]*100;
					color.percent[2]=values[12]*100;
					color.percent[3]=values[18]*100;
				}
			}
			return color;
		},
		_transformFilter:function(matrix,element,defs){
			defs=defs||element.defs;
			if(!defs){
				return;
			}
			var sx=matrix.scaleX;
			var sy=matrix.scaleY;
			if(sx==1 && sy==1)return;

			if(element.hasOwnProperty('@filter')){
				var filterID=String(
					element.@filter
				).match(
					/(?:url\(#)(.*?)(?:\))/
				);
				if(
					filterID &&
					filterID.length>1
				){
					var filter=defs.filter.(@id==filterID[1]);
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