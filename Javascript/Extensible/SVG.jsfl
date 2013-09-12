(function(ext){

	function SVG(options){
		fl.outputPanel.clear();

		this.VIEW_BOX_PADDING=50; // Adds gap around viewBox to avoid clipping.

		this.DEFAULT_GRADIENT_LENGTH=819.2; // Pre-transformation length of ALL linear gradients in flash.
		this.DEFAULT_GRADIENT_RADIUS=810.7; // Pre-transformation radius of ALL radial gradients in flash.
		this.DEFAULT_BITMAP_SCALE=1/20;
		this.MAX_INLINE_CALL_COUNT=2999; // Max recursions
		this.IDENTITY_MATRIX='matrix(1 0 0 1 0 0)';
		this.NO_TWEEN_SPLINE='1 0 1 0';
		this.DOCUMENT_DATA='SVGExportOptions';
		this.MODULO_STAND_IN='.__';

		// Processing states
		this.STATE_PRE_INIT = 0;
		this.STATE_ELEMENT_READING = 1;
		this.STATE_DELETE_EXISTING_FILES = 2;
		this.STATE_EXPANDING_USE_NODES = 3;
		this.STATE_REMOVING_UNUSED_SYMBOLS = 4;
		this.STATE_FINALISING_FILES = 5;
		this.STATE_CLEANUP = 6;
		this.STATE_DONE = 7;

		var settings=new ext.Object({
			file:undefined,
			decimalPointPrecision:3,
			expandSymbols:'usedOnce', // 'nested', 'all', 'none', usedOnce
			rendering:'auto', // 'auto', 'optimizeSpeed', 'optimizeQuality', 'inherit'
			convertPatternsToSymbols:true,
			applyTransformations:true,
			applyColorEffects:true,
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
			includeHiddenLayers:ext.includeHiddenLayers,
			convertTextToOutlines:true,
			includeGuides:false,
			selection:null,
			swfPanelName:null,
			id:String(ext.doc.name.stripExtension().camelCase()),
			x:0,y:0,
			width:ext.doc.width,
			height:ext.doc.height,
			docString:'<?xml version="1.0" encoding="utf-8"?>\n<!-- Generator: flash2svg, http://dissentgraphics.com/tools/flash2svg -->\n',
			version:'1.1',
			baseProfile:'basic',
			log:ext.doc.pathURI.stripExtension()+'.log.csv', // debugging log
			traceLog:false,
			source:'current',// 'current', 'libraryItems'
			output: 'animation',// 'animation', 'images'
			clipToScalingGrid:false, // only relevant when source=='Selected Library Items'
			clipToBoundingBox:false, // only relevant when source=='Selected Library Items'
			beginAnimation:"0s",
			repeatCount:"indefinite"
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
			this.file=this.file.absoluteURI(ext.doc.pathURI.dir);			
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

		if(this.output=='animation'){
			this.animated = true;
		}
		if(typeof(this.curveDegree)=='string'){
			this.curveDegree=['','','Quadratic','Cubic'].indexOf(this.curveDegree);
		}
		this.swfPanel=ext.swfPanel(this.swfPanelName); // the swfPanel
		this._timer=undefined;
		this._symbols={};
		this._symbolBounds={};
		this._symbolToUseNodes={};
		this._bitmaps={};
		//this._rootItem={};
		this._tempFolder=ext.lib.uniqueName('temp'); // Library folder holding temporary symbols.
		this._ids={}; // Used by uniqueID() for cross-checking IDs.
		this._origSelection=new ext.Selection([]);
		this._delayedProcessing=true;// If true, a timeline is processed one level deep in it's entirety before progressing to descendants.
		this.currentState=0;

		if(this.startFrame!=undefined){
			if(
				this.endFrame==undefined ||
				this.endFrame<=this.startFrame
			){
				this.endFrame=this.startFrame+1;
			}
			this.frames=new ext.Array();
			for(
				var i=this.startFrame;
				i<this.endFrame;
				i++
			){
				this.frames.push(i);
			}
		}
		if(this.source=='current'){
			timeline={
				timeline:ext.timeline,
				matrix:ext.viewMatrix,
				frames:new ext.Array([]),
				width:ext.doc.width,
				height:ext.doc.height,
				libraryItem:ext.timeline.libraryItem
			};
			if(this.frames.length){
				timeline.frames.extend(this.frames);
			}else{
				timeline.frames.push(ext.frame);
			}
			this.timelines.push(timeline);
		}else if(this.source=='libraryItems'){
			this.timelines.clear();
			var selectedItems=ext.lib.getSelectedItems();
			var width,height;
			for(var i=0;i<selectedItems.length;i++){
				if(selectedItems[i] instanceof ext.SymbolItem){
					timeline=selectedItems[i].timeline;
					if(timeline){selectedItems[i]
						var timeline={
							timeline:timeline,
							matrix:new ext.Matrix(),
							frames:this.frames,
							libraryItem:selectedItems[i]
						};
						if(
							this.clipToScalingGrid &&
							selectedItems[i].scalingGrid
						){
							var rect=selectedItems[i].scalingGridRect;
							timeline.width=rect.right-rect.left;
							timeline.height=rect.bottom-rect.top;
							timeline.matrix.x=-rect.left;
							timeline.matrix.y=-rect.top;
						}else{
							timeline.width=ext.doc.width;
							timeline.height=ext.doc.height;
						}
						this.timelines.push(timeline);
					}
				}
			}
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
					return this.nextState();
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
				case this.STATE_DELETE_EXISTING_FILES:
					this.qData.push(closure(this.deleteExistingFiles, [], this));
					break;
				case this.STATE_EXPANDING_USE_NODES:
					this.qData.push(closure(this.processExpandUseNodes, [], this));
					break;
				case this.STATE_REMOVING_UNUSED_SYMBOLS:
					//this.qData.push(closure(this.processRemoveUnused, [], this));
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
			if(this.log && typeof(this.log)=='string'){
				ext.startLog({url:this.log});
				this._timer=ext.log.startTimer('extensible.SVG()');
				var timer=ext.log.startTimer('extensible.SVG.begin()');
			}
			var i,n;
			this._origSelection=ext.sel;
			ext.doc.selectNone(); // selection slows performance & can cause crashes
			this.doms = [];
			for(i=0;i<this.timelines.length;i++){

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

				var timeline = this.timelines[i];
				var x=this._getTimeline(
					timeline.timeline,
					{
						dom:xml,
						matrix:timeline.matrix,
						startFrame:this.startFrame,
						endFrame:this.endFrame,
						//selection:this.selection,
						libraryItem:timeline.libraryItem,
						isRoot:true,
						flattenMotion:this.flattenMotion,
						beginAnimation:this.beginAnimation,
						repeatCount:this.repeatCount
					}
				);
				xml.appendChild(x);

				this.doms[i] = xml;
			}
			if(ext.log){
				ext.log.pauseTimer(timer);	
			}
		},
		/*
		 * If the target is a file and needs to be a folder, delete it first,
		 * and vice-versa.
		 */
		deleteExistingFiles:function(){
			var fileExists=FLfile.exists(this.file);
			if(
				this.file && 
				fileExists && (
					(
						(
							this.timelines.length > 1 ||
							this.frames.length > 1
						) && (
							FLfile.getAttributes(
								this.file
							).indexOf("D")<0
						)
					)||(
						(
							this.timelines.length==1 &&
							this.frames.length==1
						) && (
							FLfile.getAttributes(
								this.file
							).indexOf("D")>-1
						)
					)
				)
			){
				FLfile.remove(this.file);
				fileExists=false;
			}

			if(this.frames.length==1 || this.animated){

				if(this.file && fileExists){
					success = FLfile.remove(this.file);
				}
			}else{

				if(this.file && !fileExists){
					if(!FLfile.createFolder(this.file))
						throw new Error('Problem creating folder.');
				}
			}
		},
		processExpandUseNodes:function(){
			if(this.expandSymbols=="none")return;


			// if(this.expandSymbols=='usedOnce'){
			// 	for(var i in this._symbols){
			// 		var useList = this._symbolToUseNodes[i];
			// 		if(useList.length==1){
			// 			var symbol = this._symbols[i];
			// 			this.qData.push(closure(this.executeExpandUse, [symbol.@id, symbol, useList, this.doms[0].defs], this));
			// 		}
			// 	}
			// }
			// else if(this.expandSymbols=='nested'){
			// 	for(var i in this._symbols){
			// 		var useList = this._symbolToUseNodes[i];
			// 		var j=0;
			// 		while(j<useList.length){
			// 			var useNode = useList[j];
			// 			if(!isDescendant(this.doms[0].defs, useNode)){
			// 				useList.splice(j, 1);
			// 			}else{
			// 				++j;
			// 			}
			// 		}
			// 		if(useList.length>0){
			// 			var symbol = this._symbols[i];
			// 			this.qData.push(closure(this.executeExpandUse, [symbol.@id, symbol, useList, this.doms[0].defs], this));
			// 		}
			// 	}
			// }
			// else{
			// 	// expand all
			// 	for(var i in this._symbols){
			// 		var useList = this._symbolToUseNodes[i];
			// 		var symbol = this._symbols[i];
			// 		this.qData.push(closure(this.executeExpandUse, [symbol.@id, symbol, useList, this.doms[0].defs], this));
			// 	}
			// }


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

					fl.trace("executeExpandUse: "+id+" "+useList.length);
					this.executeExpandUse(id, symbol, useList, defs);

					if(isNaN(element.childIndex())){
						// symbol was swapped in for use node
						element = symbol;
						fl.trace("switch: "+element.localName());
					}
					fl.trace("Ex: "+id+" "+element.childIndex());
				}

			}

			var children = element.children();
			if(children.length()){
				// goto first child
				//fl.trace("\tChild: "+element.localName()+" "+children[0].localName()+" "+children[0].@id);
				this.qData.unshift(closure(this.checkExpand, [children[0], defs, root, onceUsed, nested], this));
				return;
			}

			if(!element.parent())return; // empty root?

			var siblings = element.parent().children();
			var index = element.childIndex();
			//fl.trace("> "+element.parent().localName()+" "+element.localName()+" "+index+" "+index);
			while(index==siblings.length()-1){
				element = element.parent();
				if(!element.parent() || element==root)return; // finished

				//fl.trace("\t\tUp:"+element.@id+" "+element.parent().@id+" "+index+" "+siblings.length());
				siblings = element.parent().children();
				index = element.childIndex();

			}
			// goto next sibling (of self or first ancestor with a next sibling)
			//fl.trace("\tNext:"+element.localName()+" "+element.@id+" "+siblings[index+1].localName()+" "+siblings[index+1].@id+" "+index+" "+siblings.length()+" "+(element==siblings[index+1])+" "+(element==siblings[index]));
			this.qData.unshift(closure(this.checkExpand, [siblings[index+1], defs, root, onceUsed, nested], this));
		},
		/*processRemoveUnused:function(){
			var onceUsed = this.expandSymbols=='usedOnce';
			for(var i=0; i<this.doms.length; ++i){
				var dom = this.doms[i];
				this.qData.push(closure(this.checkUnused, [dom.defs.symbol[0], dom, dom..use], this));
			}
		},
		checkUnused:function(element, root, useNodes){
			var id = "#"+element.@id;
			var useNodes = root..use;
			var found = false;
			for(var i=0; i<useNodes.length(); ++i){
				var useNode = useNodes[i];
				if(useNode['@xlink-href']==id){
					found = true;
					break;
				}
			}
			var parent = element.parent();
			var index = element.childIndex();
			if(!found){
				delete parent.children()[index];
				--index;
			}

			var siblings = parent.children();
			if(index==siblings.length()-1)return; // done

			this.qData.unshift(closure(this.checkUnused, [siblings[index+1], root, useNodes], this));
		},*/
		processFinaliseDocuments:function(){
			for(var k=0; k<this.timelines.length;k++){
				var timeline = this.timelines[k];
				var dom = this.doms[k];
				if(this.frames.length==1 || this.animated){
					documents = [dom];
				}else{
					documents = this._splitXML(dom);
				}
				for(var i=0;i<documents.length;i++){
					var document = documents[i];

					ext.message("this.applyTransformations: "+this.applyTransformations);
					if(this.applyTransformations){
						this.applyMatrices(document);
					}
					ext.message("this._applyColorEffects: ");
					this._applyColorEffects(document,document.defs);
					//ext.message("this.deleteUnusedReferences: ");
					//this.deleteUnusedReferences(document);
					document['@xmlns']="http://www.w3.org/2000/svg";

					if(!document['@viewBox'].length()){
						document['@viewBox']=String(this.x)+' '+String(this.y)+' '+String(this.width)+' '+String(this.height);
						document.@width = this.width;
						document.@height = this.height;
					}

					if(this.includeBackground){
						document['@enable-background']='new '+document['@viewBox'];
					}

					if(this.file){
						var outputObject = {};
						outputObject.string= this.docString + document.toXMLString();

						this.qData.push(closure(this.processFixUseLinks, [outputObject], this));
						this.qData.push(closure(this.processCompactColours, [outputObject], this));
						this.qData.push(closure(this.processRemoveIdentMatrices, [outputObject], this));
						this.qData.push(closure(this.processConvertHairlineStrokes, [outputObject], this));
						this.qData.push(closure(this.processSaveFile, [documents, outputObject], this));
					}
				}
			}
		},
		processFixUseLinks:function(outputObj){
			outputObj.string = outputObj.string.replace(
									/(<[^>]*?)xlink-(.*?)="/g,
									'$1xlink:$2="'
								);
		},
		processCompactColours:function(outputObj){
			outputObj.string = outputObj.string.replace(
									/#([0-9A-F])\1([0-9A-F])\2([0-9A-F])\3/gi,
									'#$1$2$3'
								);
		},
		processRemoveIdentMatrices:function(outputObj){
			outputObj.string = outputObj.string.replace(' transform="matrix(1 0 0 1 0 0)"','');
			outputObj.string = outputObj.string.replace(" transform='matrix(1 0 0 1 0 0)'",'');
		},
		processConvertHairlineStrokes:function(outputObj){
			outputObj.string = outputObj.string.replace(' stroke="0"',' stroke="0.1"');
			outputObj.string = outputObj.string.replace(" stroke='0'",' stroke="0.1"');
		},
		processSaveFile:function(documents, outputObj){
			if(documents.length==1){
				success=FLfile.write(this.file,outputObj.string);
			}else{
				var rPath=decodeURIComponent(
					String(
						documents[i].@id
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
			}
			if(!success){
				ext.warn('Problem writing '+outputPath||this.file);
			}
		},
		processCleanup:function(){
			fl.showIdleMessage(true);
			if(this.log){
				ext.stopLog();
			}
			/*
			 * cleanup temporary items
			 */
			if(ext.lib.itemExists(this._tempFolder)){
				ext.lib.deleteItem(this._tempFolder);	
			}
			ext.sel=this._origSelection;
			var epSuccess=true;
			if(this.swfPanel){
				epSuccess=this.swfPanel.call('endProgress');	
			}
			if(epSuccess){
				ext.message('Export Successful: '+this.file);
			}
		},
		/**
		 * Expands symbol instances ( use tags ).
		 * @parameter {XML} xml An svg document or graphic element.
		 * @parameter {Boolean} recursive
		 * @parameter {XML} defs
		 */
		expandUseNow:function( xml, within, onlyOnceUsed, recursive, defs ){
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
			return xml;
		},
		executeExpandUse:function(id, symbol, useList, defs){

			var doRemove =  true;
			for(var i=0; i<useList.length; ++i){
				var useNode = useList[i];
				if(i==0 && useList.length==1){
					delete symbol.parent().children()[symbol.childIndex()];
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
					delete symbol['@viewBox'];

					if(useNode.@transform && useNode.@transform!=this.IDENTITY_MATRIX)symbol.@transform = useNode.@transform;
					delete useNode.parent().children()[useNode.childIndex()];

					doRemove = false;
				}else{
					var symCopy = symbol[0].copy();
					this.copyNodeContents(useNode, symCopy);
					useNode.setName('g');
					for each(var child in symCopy.*){
						useNode.appendChild(child);
					}
					useNode['@id']=this._uniqueID(String(symbol['@id'])+'_1');
					delete useNode['@xlink-href'];
					delete useNode['@width'];
					delete useNode['@height'];
					delete useNode['@x'];
					delete useNode['@y'];
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
					fl.trace("expand: "+id);
				}
			}
			if(doRemove)delete symbol.parent().children()[symbol.childIndex()];
		},
		/**
		 * Deletes unreferenced defs.
		 * @parameter {XML} xml
		 */
		// deleteUnusedReferences:function(xml){
		// 	if(!xml.defs || xml.defs.length()==0){
		// 		return xml;	
		// 	}
		// 	var refs=this._listReferences(xml);//memory errors!
		// 	var references=xml.defs.*.copy();
		// 	delete xml.defs.*;
		// 	for each(var def in references){
		// 		if(
		// 			refs.indexOf(String(def.@id))>=0 && (
		// 				def.localName()!='filter' ||
		// 				def.*.length()>0
		// 			)
		// 		){
		// 			xml.defs.appendChild(def);
		// 		}
		// 	}
		// 	return xml;
		// },
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

		processElement:function(id, node, element, settings, dom){
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
			for(var i=0; i<fromNode.children().length(); i++){
				var child = fromNode.children()[i];
				toNode.appendChild(child);
			}
		},
		/**
		 * Retrieves the svg data corresponding to a DOM Element.
		 * @parameter {extensible.Element} element
		 * @parameter {Object} options Options object, contents dependant on element type.
		 * @private
		 */
		_getElement:function(element,options){
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
					result=this._getSymbolInstance(element,settings);
				}else if(element.instanceType=='bitmap'){
					result=this._getBitmapInstance(element,settings);
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
				includeGuidedTweens:false
			});
			settings.extend(options);
			var f=new ext.Array();
			var layers=settings.timeline.layers;
			for(var l=0;l<layers.length;l++){
				var layer = layers[l];
				if(
					( layer.visible || settings.includeHiddenLayers ) && 
					( layer.layerType!='guide' || settings.includeGuides) &&
					  layer.layerType!="folder"
				){
					var layerEnd = settings.endFrame;
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
		_getTimeline:function(timeline,options){
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

			if(settings.startFrame>timeline.frameCount-1){
				settings.startFrame = timeline.frameCount-1;
			}
			if(settings.endFrame > timeline.frameCount-1){
				settings.endFrame = timeline.frameCount-1;
			}

			if(settings.frameCount==null){
				settings.frameCount = settings.endFrame-settings.startFrame+1;
			}else{
				if(settings.endFrame > settings.startFrame+settings.frameCount-1){
					settings.endFrame = settings.startFrame+settings.frameCount-1;
				}
			}

			var symbolIDString = timeline.name;
			if(settings.color){
				symbolIDString += '_'+settings.color.idString; //should factor this out and use a transform
			}
			if(timeline.frameCount>1){
				if(settings.startFrame==settings.endFrame){
					// // check whether we can use a previous frame
					// var failed = false;
					// var lastPrior = settings.startFrame;
					// var layers = timeline.getLayers();
					// for(var i=0; i<layers.length && !failed; i++){
					// 	var layer=layers[i];
					// 	var thisFrame = layer.frames[settings.startFrame];
					// 	if(thisFrame){
					// 		for(var j=0; j<thisFrame.elements.length; j++){
					// 			var element = thisFrame.elements[j];
					// 			if(element.symbolType=="graphics" && element.loop!="single frame"){
					// 				failed = true;
					// 				break;
					// 			}
					// 		}
					// 		if(thisFrame.startFrame>lastPrior){
					// 			lastPrior = thisFrame.startFrame;
					// 		}
					// 	}else if(layer.frames.length-1>lastPrior){
					// 		lastPrior = layer.frames.length-1;
					// 	}
					// }
					// if(!failed){
					// 	fl.trace("use earlier frame: "+settings.startFrame+" "+ lastPrior+" "+(this._symbols[symbolIDString]!=null));
					// 	settings.startFrame = lastPrior;
					// 	settings.endFrame = lastPrior;
					// }

					symbolIDString += '_f'+settings.startFrame;
				}else if(settings.timeOffset!=null && settings.timeOffset>0){
					symbolIDString += '_t'+Math.round(settings.timeOffset * Math.pow(10, this.decimalPointPrecision));
				}
			}
			var isNew,instanceID,boundingBox;
			if(this._symbols[symbolIDString]){
				isNew=false;
				xml = this._symbols[symbolIDString];
				id = xml.@id;
				boundingBox = this._symbolBounds[symbolIDString];
			}else{
				isNew=true;
				id = this._uniqueID(symbolIDString);
				var layers = timeline.getLayers();

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
						includeGuidedTweens:true
					});

				 /**
					If a graphic layer is completely in sync with the root timeline it gets exported as a whole timeline (like an MC).
					Otherwise, it is exported frame by frame, which can be reused elsewhere (but is bigger).
				 */
				/*var syncedLayers = {};
				layers = timeline.getLayers();
				var frameOffset = settings.timeOffset/(1/ext.doc.frameRate);
				for(var i=0;i<layers.length;i++){
					var layer=layers[i];
					var synced = true;
					var lastElement;

					var layerEnd = settings.endFrame+1;
					if(layerEnd>layer.frameCount)layerEnd = layer.frameCount;

					for(var n=settings.startFrame; n<layerEnd; ++n){
						var frame=layer.frames[n];
						if(frame.startFrame!=n)continue;
						var element = frame.elements[0];
						if(frame.elements.length!=1 || element.symbolType!="graphic" || frameOffset!=element.firstFrame || (lastElement && element.libraryItem!=lastElement.libraryItem) || (element.loop=="single frame" && frame.duration>1)){
							synced = false;
							break;
						}
						lastElement = element;
					}
					if(synced && lastElement){
						fl.trace("in sync: "+layer.name);
						syncedLayers[i] = true;
					}
				}*/

				/*
				 * Create temporary timelines where tweens exist & convert to
				 * keyframes.
				 */
				var originalScene,timelines;
				if(hasTweens){
					if(settings.libraryItem==undefined){
						originalScene=timeline.name;

						ext.doc.editScene(ext.doc.timelines.indexOf(timeline.$));
						ext.doc.duplicateScene();
						//ext.doc.editScene(ext.doc.timelines.indexOf(timeline.$)+1); // edit new scene (after duplication current scene changes to last scene)

						timelines=ext.doc.timelines;
						timeline=new ext.Timeline(timelines[ext.doc.timelines.indexOf(timeline.$)+1]);
					}else{
						var tempName=this._tempFolder+'/'+settings.libraryItem.name;
						if(!ext.lib.itemExists(tempName.dir)){
							ext.lib.addNewItem('folder',tempName.dir);
						}
						ext.lib.selectItem(settings.libraryItem.name);
						ext.lib.duplicateItem();
						ext.lib.moveToFolder(tempName.dir);
						ext.lib.renameItem(tempName.basename);
						
						timeline=new ext.Timeline(ext.lib.getSelectedItems()[0].timeline);
					}
					layers = timeline.getLayers();
					for(var i=0;i<layers.length;i++){
						var layer=layers[i];
						var layerEnd = settings.endFrame+1;
						if(layerEnd>layer.frameCount)layerEnd = layer.frameCount;

						timeline.setSelectedLayers(layer.index);
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
								var resolvedFrame = this._getPriorFrame(firstElement.timeline, firstElement.firstFrame);
								for(var k=0; k<frame.duration; ++k){
									if(this._getPriorFrame(firstElement.timeline, firstElement.firstFrame + k) != resolvedFrame){
										breakApart = true;
										fl.trace("YO");
										break;
									}
								}
								if(!breakApart){
									firstElement.loop = "single frame";
								}
							}
							if(breakApart){
								var end = start+frame.duration;
								timeline.$.convertToKeyframes(start, end);
								n = end-1;
							}

						}
					}
				}
				/*
				 * Retrieve elements in the current frames, get bounding box
				 */
				if(!settings.selection){
					var frames = [];
					for(var i=0;i<layers.length;i++){
						var layer=layers[i];
						var layerEnd = settings.endFrame+1;
						if(layerEnd>layer.frameCount)layerEnd = layer.frameCount;

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
					var items =timeline.getElements(options);
					boundingBox =this._getBoundingBox(items);
				}else{
					boundingBox = this._getBoundingBox(settings.selection);
				}
				this._symbolBounds[symbolIDString] = boundingBox;
			}
			ext.message("getTimeline: "+symbolIDString+" "+settings.startFrame+" "+settings.endFrame+" "+settings.frameCount+" "+isNew+" "+settings.timeOffset);
			var instanceID=this._uniqueID(id);	
			instanceXML=new XML('<use xlink-href="#'+id+'" id="'+instanceID+'" />');
			if(isNew){
				instanceXML['@width']=0;
				instanceXML['@height']=0;
				instanceXML['@x']=0;
				instanceXML['@y']=0;
				instanceXML['@overflow']="visible";

				xml=new XML('<symbol/>');
				xml['@id']=id;

				this._symbols[symbolIDString] = xml;
				this._symbolToUseNodes[symbolIDString] = [instanceXML];

				if(this.animated){
					var totFrames = (settings.endFrame-settings.startFrame+1);

					var animNode = <animate
								      attributeName="display"/>;

					animNode.@begin = settings.beginAnimation;
					animNode.@repeatCount = settings.repeatCount;


					/*var animDur = totFrames*(1/ext.doc.frameRate);
					if(settings.totalDuration<animDur){
						animDur = settings.totalDuration;
					}
					animDur = Math.roundTo(animDur,this.decimalPointPrecision);*/

					if(settings.totalDuration!=null){
						animDur = settings.totalDuration;
					}else{
						if(this.repeatCount=="indefinite"){
							// when looping, we behave as if the timeline is 1 frame shorter so the last KF acts as an end-point (making for seemless loops)
							animDur = this.precision((totFrames-1)*(1/ext.doc.frameRate));
						}else{
							animDur = this.precision(totFrames*(1/ext.doc.frameRate));
						}
					}

					animNode.@dur = animDur+"s";
				}else{
					animDur = 0;
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
					if(layer.layerType=="guide")continue;

					var layerEnd = settings.endFrame+1;
					if(layerEnd>layer.frameCount)layerEnd = layer.frameCount;

					var doAnim = this.animated && layerEnd-settings.startFrame-1>1 && settings.frameCount!=1;

					var lVisible=layer.visible;
					var lLocked=layer.locked;
					if(!lVisible){layer.visible=true;}
					if(lLocked){layer.locked=false;}

					//var layerId = this._uniqueID(layer.name);
					var layerId = id

					if(masked.length && layer.layerType!='masked'){
						// masked layers have ended group
						this._doMask(xml, masked, maskId);
					}


					var colorX=null;
					var isMask = false;
					var isMasked = false;
					if(layer.layerType=='mask'){
						maskId = layerId;
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
					var frames = layer.getFrames();
					for(var n=settings.startFrame; n<layerEnd; ++n){
						var frame = new ext.Frame(frames[n]);
						var tweenType = frame.tweenType;


						var items = this._getItemsByFrame(frame, settings.selection);
						if(items.length==0)continue;
						var itemBounds = this._getBoundingBox(items);
						if(boundingBox.left>itemBounds.left)boundingBox.left = itemBounds.left;
						if(boundingBox.top>itemBounds.top)boundingBox.top = itemBounds.top;
						if(boundingBox.right<itemBounds.right)boundingBox.right = itemBounds.right;
						if(boundingBox.bottom<itemBounds.bottom)boundingBox.bottom = itemBounds.bottom;

						var frameXML;
						var startType = layer.frames[frame.startFrame].tweenType;
						if(this.animated && (animatedFrames[i+"-"+n] || (frame.startFrame!=n && n!=settings.startFrame && (startType=='none' || (!settings.flattenMotion && startType=="motion"))))){
							// Skip frames that haven't changed or are motion tweens (when in animation mode).
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
						var filtered;
						if(isMask){
							frameXML=<mask id={layerFrameId}/>;
							if(colorX){
								filtered=<g id={this._uniqueID('g')} />;
								frameXML.appendChild(filtered);
								var f=this._getFilters(
									null,{
										color:colorX,
										boundingBox:boundingBox
									}, dom.defs
								);
								if(f){
									filtered.@filter="url(#"+f+")";
								}
							}
						}else if(isMasked){
							frameXML=new XML('<g id="'+layerFrameId+'" />');
						}else{
							frameXML=new XML('<g id="'+layerFrameId+'" />');
						}

						var doCollateFrames = (doAnim && !settings.flattenMotion  && items.length==1 && tweenType!="shape" && items[0].$.elementType=="instance");
						var frameEnd = n+1;
						var transToDiff = false;
						if(doCollateFrames){
							var mainElem = frame.elements[0];
							if(mainElem.loop=="single frame" || frame.duration==1)var singleFrameStart = this._getPriorFrame(mainElem.timeline, mainElem.firstFrame)
							while(frameEnd<layerEnd){
								var nextFrame = layer.frames[frameEnd];
								if(nextFrame){
									if(nextFrame.startFrame==frameEnd){
										// keyframe
										var nextElem = nextFrame.elements[0];
										if(nextFrame.elements.length!=1){
											break; // tweening to incompatible frame
										}else if(nextElem.libraryItem!=mainElem.libraryItem || mainElem.symbolType!=nextElem.symbolType || 
												(mainElem.symbolType=="graphic" &&
													    ((nextElem.loop!=mainElem.loop && !((mainElem.loop=="single frame" || frame.duration==1) && (nextElem.loop=="single frame" || nextFrame.duration==1)))
													 || ((nextElem.loop=="single frame" || nextFrame.duration==1) && singleFrameStart!=this._getPriorFrame(nextElem.timeline, nextElem.firstFrame))
													 || (nextElem.loop!="single frame" && nextFrame.duration>1 && mainElem.firstFrame!=nextElem.firstFrame))/* && !syncedLayers[i]*/)){
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
							var elementID=this._uniqueID('element');

							var time = settings.timeOffset+(n - settings.startFrame)*(1/ext.doc.frameRate);
							var elemSettings = {
										frame:n,
										dom:dom,
										timeOffset:time,
										frameCount:(frameEnd - n),
										totalDuration:animDur,
										beginAnimation:"0s",
										repeatCount:settings.repeatCount
									};

							if(element.symbolType=="graphic"){
								if(element.loop=="single frame" || frame.duration==1){
									elemSettings.frameCount = 1;
									elemSettings.startFrame = this._getPriorFrame(element.timeline, element.firstFrame);
								}else{
									elemSettings.startFrame = element.firstFrame + (n - frame.startFrame);
									var maxCount = (settings.endFrame + 1) - n;
									if(maxCount<elemSettings.frameCount)elemSettings.frameCount = maxCount;
									if(elemSettings.startFrame>=element.libraryItem.timeline.frameCount){
										if(element.loop=="loop"){
											elemSettings.startFrame = elemSettings.startFrame%element.libraryItem.timeline.frameCount;
										}else{
											elemSettings.startFrame = element.libraryItem.timeline.frameCount-1;
										}
									}
								}
							}else if(element.symbolType=="movie clip" && element.libraryItem.timeline.frameCount<(frameEnd-n)*0.5 && frameEnd>n+1){
								// if MC play time is shorter than half of it's visible run, we'll treat it as an independant loop
								elemSettings.timeOffset = 0;
								elemSettings.frameCount = element.libraryItem.timeline.frameCount;
								elemSettings.totalDuration = (elemSettings.frameCount-1)*(1/ext.doc.frameRate);
								elemSettings.repeatCount = "indefinite";
							}

							if(this._delayedProcessing){
								var elementXML=new XML('<g id="'+elementID+'"></g>');
								this.qData.push(closure(this.processElement, [elementID, elementXML, element, elemSettings, dom], this));
							}else{
								var elementXML=this._getElement(
									element,elemSettings
								);
							}
							if(elementXML){
								if(layer.layerType=='mask' && colorX){
									filtered.appendChild(elementXML);
								}else{
									frameXML.appendChild(elementXML);
								};
							}
						}
						if(doAnim){
							
							if(doCollateFrames){
								var firstRot = this._getRotation(element);
								var firstSkX = element.skewX;
								var firstSkY = element.skewY;

								var xList = [];
								var yList = [];
								var scxList = [];
								var scyList = [];
								var skxList = [];
								var skyList = [];
								var rotList = [];
								var trxList = [];
								var tryList = [];

								var timeList = [];
								var splineList = [];

								var tweensFound = (frame.tweenType!="none" && frame.duration>1);

								var matrix = element.matrix.clone();
								var invMatrix = matrix.invert();
								var time = settings.timeOffset+(n*(1/ext.doc.frameRate))/animDur;
								this._addAnimFrame(frame, element, invMatrix, time, 0, 0, 0, xList, yList, scxList, scyList, skxList, skyList, rotList, trxList, tryList, timeList, splineList);
								
								var lastRot = 0;

								var lastFrame = frame;

								var autoRotate = 0;

								var mainElem = frame.elements[0];
								for(var nextInd = n+1; nextInd<frameEnd; ++nextInd){
									var nextFrame = layer.frames[nextInd];
									if(nextFrame.startFrame!=nextInd)continue;

									var attemptForeRot = true;
									var attemptBackRot = true;
									var time = (settings.timeOffset+nextInd*(1/ext.doc.frameRate))/animDur;
									if(lastFrame.tweenType=="none" || lastFrame.duration==1){
										timeList.push(this.precision(time-0.0000001));
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
									//if(nextFrame.tweenType!="none" && frame.duration>1)

									var nextElement = nextFrame.elements[0];
									var rot = this._getRotation(nextElement) - firstRot;
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

									rot += autoRotate;

									// if there is a rotation tween of up to 45 degrees, we add extra bounds to accomodate it.
									var rotDif = Math.abs(lastRot - rot)/180*Math.PI;
									if(rotDif>Math.PI/4)rotDif = Math.PI/4;
									var swingLeft = nextElement.matrix.tx+(nextElement.left-nextElement.matrix.tx)*Math.cos(rotDif)+(nextElement.top-nextElement.matrix.ty)*Math.sin(rotDif);
									var swingTop = nextElement.matrix.ty+(nextElement.top-nextElement.matrix.ty)*Math.cos(rotDif)+(nextElement.left-nextElement.matrix.tx)*Math.sin(rotDif);
									var swingRight = nextElement.matrix.tx+(nextElement.right-nextElement.matrix.tx)*Math.cos(rotDif)+(nextElement.bottom-nextElement.matrix.ty)*Math.sin(rotDif);
									var swingBottom = nextElement.matrix.ty+(nextElement.bottom-nextElement.matrix.ty)*Math.cos(rotDif)+(nextElement.right-nextElement.matrix.tx)*Math.sin(rotDif);
									if(boundingBox.left>swingLeft)boundingBox.left = swingLeft;
									if(boundingBox.top>swingTop)boundingBox.top = swingTop;
									if(boundingBox.right<swingRight)boundingBox.right = swingRight;
									if(boundingBox.bottom<swingBottom)boundingBox.bottom = swingBottom;

									this._addAnimFrame(nextFrame, nextElement, invMatrix, time, rot, skewX, skewY, xList, yList, scxList, scyList, skxList, skyList, rotList, trxList, tryList, timeList, splineList);

									if(!transToDiff || nextInd<frameEnd-1)animatedFrames[i+"-"+nextInd] = true;
									if(nextFrame.elements.length>1 || nextElement.libraryItem!=element.libraryItem)break;

									lastFrame = nextFrame;

									lastRot = rot;
								}
								if(lastFrame.tweenType=="none" || lastFrame.duration==1){
									// this code works in tandem with code within _addAnimFrame which adds an 'end-point' to non-tweened frame runs
									xList.pop();
									yList.pop();
									scxList.pop();
									scyList.pop();
									skxList.pop();
									skyList.pop();
									rotList.pop();
									trxList.pop();
									tryList.pop();
									splineList.pop();
								}
								// // the ordering of these animation nodes is important
								this._addAnimationNode(elementXML, "translate", [xList, yList], timeList, animDur, splineList, tweensFound, null, settings.beginAnimation, settings.repeatCount)
								this._addAnimationNode(elementXML, "rotate", [rotList, trxList, tryList], timeList, animDur, splineList, tweensFound, null, settings.beginAnimation, settings.repeatCount, rotList.length>1)
								this._addAnimationNode(elementXML, "skewX", [skxList], timeList, animDur, splineList, tweensFound, null, settings.beginAnimation, settings.repeatCount)
								this._addAnimationNode(elementXML, "skewY", [skyList], timeList, animDur, splineList, tweensFound, null, settings.beginAnimation, settings.repeatCount)
								this._addAnimationNode(elementXML, "scale", [scxList, scyList], timeList, animDur, splineList, tweensFound, 1, settings.beginAnimation, settings.repeatCount, scxList.length>1)

								elementXML.@transform = this._getMatrix(matrix);

							}/*else if(tweenType=='none'){
								while(frameEnd<layer.frames.length && layer.frames[frameEnd].startFrame==n){
									frameEnd++;
									// this will add in extra time for frames with non changing content (which won't be included as a real frame)
								}
							}*/
							var frameTimeStart = String(this.precision((settings.timeOffset + (n - settings.startFrame)*(1/ext.doc.frameRate))/animDur));
							var frameTimeEnd = String(this.precision((settings.timeOffset + ((transToDiff?frameEnd-1:frameEnd) - settings.startFrame)*(1/ext.doc.frameRate))/animDur));
							if(frameTimeEnd>1)frameTimeEnd = 1;

							if(frameTimeStart>1)fl.trace("START TIME WARNING: "+frameTimeStart+" "+settings.timeOffset+" "+animDur+" "+n+" "+settings.startFrame+" "+((n - settings.startFrame)*(1/ext.doc.frameRate)));
							if(frameTimeEnd>1)fl.trace("END TIME WARNING: "+frameTimeEnd);

							if(items.length>0 && (frameTimeStart!=0 || frameTimeEnd!=1)){ // don't bother if element is always there
								var fAnimNode = animNode.copy();
								if(frameTimeStart==0){
									fAnimNode.@keyTimes = frameTimeStart+";"+frameTimeEnd+";1";
									fAnimNode.@values="inline;none;none";

								}else if(frameTimeEnd==1){
									fAnimNode.@keyTimes = "0;"+frameTimeStart+";"+frameTimeEnd;
									fAnimNode.@values="none;inline;none";

								}else{
									fAnimNode.@keyTimes = "0;"+frameTimeStart+";"+frameTimeEnd+";1";
									fAnimNode.@values="none;inline;none;none";

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
				this._symbolToUseNodes[symbolIDString].push(instanceXML);
			}
			/*
			 *  If this is a temporary scene, delete it and return to the original.
			 */
			if(originalScene!=undefined){
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
			}
			if(isNew){ // set the viewBox
				if(settings.isRoot && this.clipToScalingGrid && settings.libraryItem){
					boundingBox=settings.libraryItem.scalingGridRect;
				}
				dom.defs.appendChild(xml);
			}
			var viewBox=(
				String(boundingBox.left)+' '+
				String(boundingBox.top)+' '+
				String(boundingBox.right-boundingBox.left)+' '+
				String(boundingBox.bottom-boundingBox.top)
			);
			if(isNew){
				xml['@viewBox'] = viewBox;
			}else{
				instanceXML['@viewBox'] = viewBox;
			}
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
			instanceXML['@transform'] = this._getMatrix(settings.matrix);
			// if(settings.isRoot && settings.libraryItem){
			// 	dom.@viewBox = viewBox;
			// 	dom.@width = instanceXML.@width;
			// 	dom.@height = instanceXML.@height;
			// }

			if(ext.log){
				ext.log.pauseTimer(timer);	
			}
			return instanceXML;
		},
		_getRotation:function(element){
			if(isNaN(element.rotation) || element.rotation==0){
				return element.skewX;
			}else{
				return element.rotation;
			}
		},
		_addAnimFrame:function(frame, element, invMatrix, time, rot, skewX, skewY, xList, yList, scxList, scyList, skxList, skyList, rotList, trxList, tryList, timeList, splineList){


			var matrix = element.matrix.concat(invMatrix);
			var transPoint = element.getTransformationPoint();


			skewX -= rot;
			skewY -= rot;


			//fl.trace("\trot: "+this.precision(rot)+" "+((matrix.b<0) != (matrix.b<0 || matrix.d>0) && (matrix.b<0) && isNaN(element.rotation))+" "+matrix);
			//fl.trace("\tcheck: ab:"+(matrix.a*matrix.b)+" ac:"+(matrix.a*matrix.c)+" db:"+(matrix.d*matrix.b)+" dc:"+(matrix.d*matrix.c));
			//fl.trace("\tcheck: sx:"+element.scaleX+" sy:"+element.scaleY);
			/*
			 a:-0.659820556640625, b:0.7513885498046875, c:-0.7513885498046875, d:-0.659820556640625 = flip
			 ab:-0.4957816111855209 ac:0.4957816111855209 db:-0.4957816111855209 dc:0.4957816111855209

			 a:-0.659820556640625, b:0.7513885498046875, c:-0.7513885498046875, d:-0.659820556640625 = none
			 ab:-0.4957816111855209 ac:0.4957816111855209 db:-0.4957816111855209 dc:0.4957816111855209

			 rot: 185.325 false ({a:0.9940643310546875, b:0.0926361083984375, c:0.0926361083984375, d:-0.9940643310546875, tx:7.6, ty:24.4})
			 sx:0.1128082275390625 sy:0.1128082275390625
			 */
			//if((matrix.b<0) != (matrix.c<0) && (matrix.b<0 || matrix.d>0) && isNaN(element.rotation)){
			if(rot * matrix.a * matrix.c * matrix.d > 0){
				rot = -rot;
				fl.trace("FLIP");
			}

			var rotRad = rot / 180 * Math.PI;

			rotList.push(this.precision(rot));

			var edittedTrans = matrix.transformPoint(transPoint);
			var rotCos = Math.cos(rotRad) - 1;
			var rotSin = Math.sin(rotRad);
			xList.push(this.precision(matrix.tx + transPoint.x * rotCos - transPoint.y * rotSin));
			yList.push(this.precision(matrix.ty + transPoint.y * rotCos + transPoint.x * rotSin));


			var rotMatrix = new ext.Matrix();
			rotMatrix.a = Math.cos(rotRad);
			rotMatrix.b = Math.sin(rotRad);
			rotMatrix.c = -Math.sin(rotRad);
			rotMatrix.d = Math.cos(rotRad);
			
			matrix = matrix.concat(rotMatrix.invert());

			scxList.push(this.precision(matrix.a));
			scyList.push(this.precision(matrix.d));

			skxList.push(this.precision(-this._getClosestRotList(skewX, skxList)));
			skyList.push(this.precision(-this._getClosestRotList(skewY, skyList)));

			trxList.push(transPoint.x);
			tryList.push(transPoint.y);

			splineList.push(this._getSplineData(frame));
			timeList.push(this.precision(time));

			if(frame.tweenType=="none" || frame.duration==1){
				xList.push(xList[xList.length-1]);
				yList.push(yList[yList.length-1]);
				scxList.push(scxList[scxList.length-1]);
				scyList.push(scyList[scyList.length-1]);
				skxList.push(skxList[skxList.length-1]);
				skyList.push(skyList[skyList.length-1]);
				rotList.push(rotList[rotList.length-1]);
				trxList.push(trxList[trxList.length-1]);
				tryList.push(tryList[tryList.length-1]);
				splineList.push(splineList[splineList.length-1]);
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
			// check whether we can use a previous frame
			var failed = false;
			var lastPrior = -1;
			var layers = timeline.getLayers();
			for(var i=0; i<layers.length && !failed; i++){
				var layer=layers[i];
				var thisFrame = layer.frames[frame];
				if(thisFrame){
					for(var j=0; j<thisFrame.elements.length; j++){
						var element = thisFrame.elements[j];
						if(element.symbolType=="graphics" && element.loop!="single frame"){
							failed = true;
							break;
						}
					}
					if(thisFrame.startFrame>lastPrior){
						lastPrior = thisFrame.startFrame;
					}
				}else if(layer.frames.length-1>lastPrior){
					lastPrior = layer.frames.length-1;
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
			var mg = <g id={this._uniqueID('masked')} mask={"url(#"+maskId+")"}/>;
			for(var m=0;m<masked.length;m++){
				mg.appendChild(masked[m]);
			}
			xml.appendChild(mg);
			masked.clear();
		},
		_addAnimationNode:function(toNode, type, valueLists, times, totalTime, splineList, tweensFound, defaultValue, beginAnimation, repeatCount, force){

			if(defaultValue==null)defaultValue = 0;

			var getValue = function(valueLists, i){
				var ret = valueLists[0][i].toString();
				for(var j=1; j<valueLists.length; ++j){
					ret += ","+valueLists[j][i];
				}
				return ret;
			}
			var found = false;
			var hasDifVals;
			for(var i=0; i<valueLists.length; ++i){
				var list = valueLists[i];
				var firstVal = list[0];
				for(var j=0; j<list.length; ++j){
					var val = list[j];
					if(j!=0 && firstVal!=val){
						hasDifVals = true;
					}
					if(val!=defaultValue){
						found = true;
					}
					if(hasDifVals && found)break;
				}
				if(hasDifVals && found)break;
			}
			if(!found || !hasDifVals){
				return false;
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

				var noneTween = (splineList[i]==this.NO_TWEEN_SPLINE);
				if(newVal==lastVal && (endPointMode || noneTween)){
					if(endPointMode)validT[validT.length-1] = lastTime;
					if(noneTween)validS[validT.length-1] = this.NO_TWEEN_SPLINE; 
				}else{
					endPointMode = (newVal==lastVal);
					lastVal = newVal;
					validV.push(newVal);
					validT.push(lastTime);
					validS.push(splineList[i]);
				}
			}
			if(validT[0]<1){
				validV.push(lastVal);
				validT.push(1);
			}else{
				validS.pop(); // spline list should be one element shorter than other lists
			}

			var animNode = <animateTransform
						      attributeName="transform" additive="sum" />;

			animNode.@begin = beginAnimation;
			animNode.@type = type;
			animNode.@repeatCount = repeatCount;

			animNode.@dur = totalTime+"s";
			animNode.@keyTimes = validT.join(";");
			animNode.@values = validV.join(";");

			if(tweensFound){
				animNode.@keySplines = validS.join(";");
				animNode.@calcMode="spline";
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
		_getSplineData:function(frame, incr){

			if(incr==null)incr = 1;

			// Tween support warnings, remove these as different tween settings gain support
			if(frame.hasCustomEase)ext.warn('Custom easing is not yet supported (at frame '+frame.startFrame+")");
			if(!frame.useSingleEaseCurve) ext.warn('Per property custom easing is not supported (at frame '+frame.startFrame+")");
			//if(frame.motionTweenRotateTimes!=0) ext.warn('Auto-rotate tweens are not yet supported (at frame '+frame.startFrame+")");

			if(frame.tweenType=="none"){
				return this.NO_TWEEN_SPLINE;
			}
			
			var fract = (frame.tweenEasing/100) * 0.8; // this number determines the severness of easing (should match flash IDE, between 0-1)
			if(frame.tweenEasing<0){
				return '0.01 0.01 1 '+this.precision(1+fract);
			}else{
				return '0 '+this.precision(fract)+' 0.99 0.99';
			}
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
		_getSymbolInstance:function(instance,options){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG._getSymbolInstance()');	
			}
			var timeline=instance.timeline;
			var settings=new ext.Object({
				startFrame:0,
				endFrame: timeline.frames.length,
				matrix: new ext.Matrix(),
				colorTransform: null,
				libraryItem:instance.libraryItem
			});
			settings.extend(options);
			ext.message("\n_getSymbolInstance: "+instance.libraryItem.name+" - loop:"+instance.loop+" frameCount:"+settings.frameCount+" startFrame:"+settings.startFrame);
			var dom = settings.dom;
			settings.matrix = instance.matrix.concat(settings.matrix);
			var xml = this._getTimeline(instance.timeline,settings);
			var filterID=this._getFilters(instance, options, dom.defs);
			if(filterID && dom.defs.filter.(@id==filterID).length()){
				xml['@filter']='url(#'+filterID+')';
			}
			if(ext.log){
				ext.log.pauseTimer(timer);
			}
			return xml;
		},
		_getFilters:function(element,options,defs){
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
								var feComponentTransfer_brightness=<feComponentTransfer id={this._uniqueID('feComponentTransfer_brightness')} />;
								var feFuncR=<feFuncR id={this._uniqueID('feFuncR')} ></feFuncR>;
								var feFuncG=<feFuncG id={this._uniqueID('feFuncG')} ></feFuncG>;
								var feFuncB=<feFuncB id={this._uniqueID('feFuncB')} ></feFuncB>;
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
								var feComponentTransfer_contrast=<feComponentTransfer id={this._uniqueID('feComponentTransfer_contrast')} />;
								var feFuncR=<feFuncR id={this._uniqueID('feFuncR')} ></feFuncR>;
								var feFuncG=<feFuncG id={this._uniqueID('feFuncG')} ></feFuncG>;
								var feFuncB=<feFuncB id={this._uniqueID('feFuncB')} ></feFuncB>;
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
								var feColorMatrix2=<feColorMatrix id={this._uniqueID('feColorMatrix')} />;
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
								var feColorMatrix=<feColorMatrix id={this._uniqueID('feColorMatrix')} />;
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

								var feGaussianBlur=<feGaussianBlur id={this._uniqueID('feGaussianBlur')} />;
								feGaussianBlur.@stdDeviation=[f.blurX, f.blurY].join(' ');
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

								var feGaussianBlur=<feGaussianBlur id={this._uniqueID('feGaussianBlur')} />;
								feGaussianBlur.@stdDeviation=[f.blurX,f.blurY].join(' ');
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
						if(!color.percent.is([100,100,100,100])){
							feColorMatrix=<feColorMatrix id={this._uniqueID('feColorMatrix')} />;
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
							var feComponentTransfer=<feComponentTransfer id={this._uniqueID('feComponentTransfer')} />;
							feComponentTransfer['@in']=src;
							feComponentTransfer.@result=src='colorEffect_amount';
							var feFuncR=<feFuncR id={this._uniqueID('feFuncR')} ></feFuncR>;
							var feFuncG=<feFuncG id={this._uniqueID('feFuncG')} ></feFuncG>;
							var feFuncB=<feFuncB id={this._uniqueID('feFuncB')} ></feFuncB>;
							var feFuncA=<feFuncA id={this._uniqueID('feFuncA')} ></feFuncA>;
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
			var xml=<image overflow='visible' id={this._uniqueID(item.name.basename.stripExtension())} />;
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
				if(this.timelines.length==1 && (this.timelines[0].frames.length==1 || this.animated)){
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
				}
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
				var timer=ext.log.startTimer('extensible.SVG._getShape() >> 1');	
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
			var id;
			if( shape.isRectangleObject || shape.isOvalObject ){ // ! important
				id=(
					shape.isRectangleObject?
					this._uniqueID('rectangleObject'):
					this._uniqueID('ovalObject')
				);
				shape.setTransformationPoint({x:0.0,y:0.0});
				var origin=new ext.Point({
					x:(shape.objectSpaceBounds.left-shape.objectSpaceBounds.right)/2,
					y:(shape.objectSpaceBounds.top-shape.objectSpaceBounds.bottom)/2
				}).transform(matrix);
				matrix.tx=origin.x;
				matrix.ty=origin.y;
				matrix=matrix.concat(settings.matrix);
				if(shape.objectSpaceBounds.left!=0 || shape.objectSpaceBounds.top!=0){
					pathMatrix=new ext.Matrix({
						tx:-shape.objectSpaceBounds.left,
						ty:-shape.objectSpaceBounds.top
					});
				}
			}else if(shape.isDrawingObject){
				id=this._uniqueID('drawingObject');
				matrix=matrix.concat(settings.matrix);
			}else if(shape.isGroup){
				id=this._uniqueID('group');
				var c=shape.center;
				var tr=shape.getTransformationPoint();
				tr = matrix.transformPoint(tr.x, tr.y, false);
				var osb=shape.objectSpaceBounds;
				
				osb.left=Math.min(osb.left,c.x-tr.x);
				osb.right=Math.max(osb.right,c.x-tr.x);
				osb.top=Math.min(osb.top,c.y-tr.y);
				osb.bottom=Math.max(osb.bottom,c.y-tr.y);

				pathMatrix=new ext.Matrix({
					tx:(
						osb.left+
						osb.right
					)/2.0,
					ty:(
						osb.top+
						osb.bottom
					)/2.0
				});
				pathMatrix=pathMatrix.invert();
				descendantMatrix = matrix.invert();
				matrix=matrix.concat(settings.matrix);
			}else{
				id=this._uniqueID('shape');
				matrix.tx=shape.left;
				matrix.ty=shape.top;
				matrix=matrix.concat(settings.matrix);
				if(
					shape.objectSpaceBounds &&
					(
						shape.objectSpaceBounds.left!=0 ||
						shape.objectSpaceBounds.top!=0
					)
				){
					pathMatrix=new ext.Matrix({tx:shape.objectSpaceBounds.left,ty:shape.objectSpaceBounds.top});
					pathMatrix=pathMatrix.invert();
				}
			}
			var contours=shape.contours;
			if(!(contours && contours.length) && !shape.isGroup){
				return;	
			}
			var svgArray=new ext.Array();
			var filled=new ext.Array();
			var tobeCut=null;
			var ii;
			var validContours=new ext.Array([]);
			for(i=0;i<contours.length;i++){
				var s=this._getContour(contours[i],{
					colorTransform:settings.colorTransform,
					matrix:pathMatrix,
					dom:dom
				});
				if(s){
					validContours.push(contours[i]);
					svgArray.push(s);
					if(contours[i].orientation!=0){
						var oppositeFill=contours[i].oppositeFill;
						var fill=contours[i].fill;
						if(
							filled.length>0 				
							//&& !(oppositeFill.style=='noFill' &&	fill.style=='noFill')
							&& s.path.length()
							//&& s.path[0].fill.length()
						){
							var deleted=false;
							for(var n=filled.length-1;n>-1;n-=1){
								var fillN = filled[n];
								var noFills=oppositeFill.style=='noFill' && fill.style=='noFill';
								var insideOut=!noFills && fill.is(validContours[fillN].fill);
								var sameDir=(
									contours[i].orientation
									//+Number(contours[i].getControlPoints( {curveDegree:this.curveDegree} ).isReversed)
									<0
								)==(
									validContours[fillN].orientation
									//+Number(validContours[fillN].getControlPoints( {curveDegree:this.curveDegree} ).isReversed)
									<0
								);
								if(
									svgArray[fillN].path.length()  
									//&& svgArray[fillN].path.fill.length()
									&& svgArray[fillN].path[0].@stroke.length()==0
									&& (
										oppositeFill.is(validContours[fillN].fill) 
										|| noFills
										|| ( 
											insideOut
											&& oppositeFill.style=='noFill'
										) //???
									) && svgArray[fillN].path[0].stroke.length()==0
								){
									var cutID=String(svgArray[fillN].path[0]['@id']);
									var rev=( sameDir && !insideOut ) || ( insideOut && !sameDir);
									if(rev){
										s=this._getContour(contours[i],{
											colorTransform:settings.colorTransform,
											reversed: true,
											matrix:pathMatrix,
											dom:dom
										});
									}else{
										s=svgArray.at(-1);
									}
									if(s && s.path.length()){
										var so=this._getContour(contours[i],{
											colorTransform:settings.colorTransform,
											reversed: !rev,
											matrix: pathMatrix,
											dom:dom
										});								
										if(so.path.length()){
											var f=String(svgArray[fillN].path[0]['@d']);
											var fs=f.match(/^[^Zz]*[Zz]?/)[0].trim();
											var pStr=String(s.path[0]['@d']);
											var pA=/^[^Zz]*[Zz]?/.exec(pStr)[0].trim();
											if(pA[pA.length-1]!=='z'){pA+='z';}
											var pStrO=String(so.path[0]['@d']).trim();
											var pAO=/^[^Zz]*[Zz]?/.exec(pStrO)[0].trim();
											if(pAO[pAO.length-1]!=='z'){pAO+='z';}
											if(
												fs==pAO || fs==pA
											){
													svgArray[fillN].path[0]['@d']+=pStr.replace(pA,'').replace(pAO,'');
													svgArray[svgArray.length-1].path[0].@d=String(
														svgArray[svgArray.length-1].path[0].@d
													).replace(pA,'').replace(pAO,'');
											}else if(
												!contours[i].edgeIDs.intersect(validContours[fillN].edgeIDs).length &&
												oppositeFill.style!="noFill"
											){
												// this creates composite paths, where a path makes the hole in another filled path
												if(pA[pA.length-1]!=='z'){
													pA+='z';
												}
												svgArray[fillN].path[0]['@d'] += pA;
												if(oppositeFill.style==fill.style!='noFill' && insideOut){
													delete svgArray[svgArray.length-1].path[0];
													deleted=true;
												}
											}										
										}
										break;
									}
								}
							}
							if(oppositeFill.style=='noFill' && fill.style=='noFill' && !deleted){
								//delete svgArray[svgArray.length-1].path[0];
							}
							if(
								fill.style=='noFill' || (
									insideOut && oppositeFill.style=='noFill'
								) 
							){
								ii=0;
								var sa=svgArray[svgArray.length-1].copy();
								for each(var n in sa.*){
									if(n['@stroke'].length()==0){
										delete svgArray[svgArray.length-1].path[ii];
									}
									ii+=1;
								}
								delete sa;
							}
						}
						if(contours[i].fill.style!='noFill'){
							filled.push(svgArray.length-1);
						}
					}
				}
			}	
			var svg=new XML('<g id="'+id+'"/>');
			var matrixStr = this._getMatrix(matrix);
			if(matrixStr!=this.IDENTITY_MATRIX)svg['@transform']=matrixStr;
			for(var i=0;i<svgArray.length;i++){
				if(svgArray[i].path.length()){ // eliminate duplicate paths
					ii=0; 
					for each(n in svgArray[i].path){
						if(
							(!n['@stroke'].length() || String(n['@stroke'][0])=='none' || String(n['@stroke'][0])=='') && 
							(!n['@fill'].length() || String(n['@fill'][0])=='none' ||  String(n['@fill'][0])=='')
						){
							delete svgArray[i].path[ii];
						}else if(n.localName()=='path' && n['@stroke'].length()){
							var cs0=String(n['@d']).replace(/[^\d\.\,]/g,' ').replace(/([^\s])(\s\s*?)([^\s])/g,'$1 $3').trim();
							var ca0=cs0.split(' ');
							if(ca0[ca0.length-1]==ca0[0]){
								ca0.pop();
								cs0=ca0.join(' ');
							}
							var s=0;
							while(s<svg.length()){
								if(svg[s].localName()=='path' && svg[s]['@stroke'].length()){
									var cs1=String(svg[s]['@d']).replace(/[^\d\.\,]/g,' ').replace(/([^\s])(\s\s*?)([^\s])/g,'$1 $3').trim();
									var ca1=cs1.split(' ');
									if(ca1[ca1.length-1]==ca1[0]){
										ca1.pop();
										cs1=ca1.join(' ');
									}
									if(ca1[0]!=ca0[0] && ca1[0]!=ca0[ca0.length-1]){
										ca1=cs1.split(ca0[0]+' '+ca0[1]+' '+ca0[2]);
										cs1=ca0[0]+' '+ca0[1]+' '+ca0[2]+' '+cs1[1].trim()+' '+cs1[0].trim();
										ca1=cs1.split(' ');
									}
									if(ca0[0]==ca1[ca1.length-1]){
										ca1=ca1.reverse()
										cs1=ca1.join(' ');
									}
									if(cs0==cs1){
										delete svg[s];
										continue;
									}
								}
								++s;
							}
						}
						ii+=1;
					}
					for each(var s in svgArray[i].*){
						svg.appendChild(s);
					}
				}
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
							repeatCount:settings.repeatCount
						}
					);
					if(e){svg.appendChild(e);}
				}
			}
			if(ext.log){
				ext.log.pauseTimer(timer);	
			}
			return svg;		
		},
		_getContour:function(contour,options){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG._getContour()');	
			}
			var settings=new ext.Object({
				matrix:null,
				reversed:false,
				colorTransform:null
			});
			settings.extend(options);
			var dom = settings.dom;

			var controlPoints=contour.getControlPoints({
				curveDegree:this.curveDegree,
				reversed:settings.reversed
			});
			if(!controlPoints || controlPoints.length==0){
				return;
			}

			var sameStrokes = contour.interior && controlPoints.length>1;

			var paths=new ext.Array();
			var xform='';
			if(settings.matrix){
				xform='transform="'+this._getMatrix(settings.matrix)+'" ';
			}	
			var id,idString;
			if(contour.interior){//Construct a curve for the enclosed shape if present.

				var tuple = {};
				var cdata = this._getCurve(controlPoints, contour.orientation, tuple);

				if(sameStrokes){
					// work out of the path is closed
					var firstPoint = controlPoints[0][0];
					var lastCont = controlPoints[controlPoints.length-1];
					var lastDeg = lastCont.length-1;
					var lastPoint = lastCont[lastDeg];
					sameStrokes = lastPoint.is(firstPoint) && !tuple.moved;
				}

				if(sameStrokes){
					// If the whole path has the same stroke we only need to create one path element, we work that out here
					var lastStroke = null;
					for(i=0;i<controlPoints.length;i++){
						var edge = controlPoints[i][0].edge;
						if(!edge.stroke || (i!=0 && !edge.stroke.is(lastStroke)) || edge.stroke.style=="noStroke"){
							sameStrokes = false;
							break;
						}
						lastStroke = edge.stroke;
					}
				}

				var fillString='none';
				var opacityString = "";
				var fill=this._getFill(contour.fill,{
					shape:contour.shape
				});
				if(fill){
					if(fill.name()=='solidColor'){
						fillString=String(fill['@solid-color']);
						var fillOp = String(fill['@solid-opacity']);
						if(fillOp && fillOp.length){
							opacityString = ' fill-opacity="'+fillOp+'"';
						}
					}else{
						dom.defs.appendChild(fill)
						fillString='url(#'+String(fill['@id'])+')';
					}
				}
				id=this._uniqueID('path');
				idString='id="'+id+'" ';
				var strokeStr = (sameStrokes?" "+this._getStroke(lastStroke,{shape:contour.shape,dom:dom}):"");
				paths.push('<path  '+idString+xform+'fill="'+fillString + '"' + strokeStr + opacityString+' d="'+cdata+'"/>\n');
			}
			if(controlPoints.length>0 && !settings.reversed && !sameStrokes){
				//Create a contour for each length of contiguous edges w/ the same stroke attributes. 
				//Skipped for settings.reversed, which is only used for creating hollows.
				var cp=new ext.Array([]);
				var stroke=null;
				var firstEdge=controlPoints[0][0].edge;
				if(firstEdge.stroke && firstEdge.stroke.style!='noStroke'){
					cp.push(controlPoints[0]);
					stroke=firstEdge.stroke;
				}
				for(i=1;i<controlPoints.length;i++){
					var edge=controlPoints[i][0].edge;
					if(edge.stroke && edge.stroke.style!='noStroke'){
						if(stroke!==null && edge.stroke.is(stroke)){
							cp.push(controlPoints[i]);
						}else{
							// next part of path has a dif'rent stroke, finalise the current path and start a new one
							if(stroke && cp.length>0){
								id=this._uniqueID('path');
								idString='id="'+id+'" ';
								paths.push(
									'<path '+
									idString+
									xform+
									'fill="none" '+
									this._getStroke(stroke,{shape:contour.shape,dom:dom})+
									'd="'+this._getCurve(cp,contour.orientation)+'" '+
									'/>\n'
								);
							}
							stroke=edge.stroke;
							cp=new ext.Array([controlPoints[i]]);
						}
					}else{
						if(stroke && cp.length>0){
							id=this._uniqueID('path');
							idString='id="'+id+'" ';
							paths.push(
								'<path '+
								idString+
								xform+
								'fill="none" '+
								this._getStroke(stroke,{dom:dom})+
								'd="'+this._getCurve(cp,contour.orientation)+'" '+
								'/>\n'
							);
						}
						stroke=null;
						cp.clear();
					}
				}
				if(stroke && cp.length>0){//create the last stroke
					if(
						firstEdge.stroke && firstEdge.stroke.style!='noStroke' && stroke.is(firstEdge.stroke)
						&& ((contour.interior && paths.length>1) || (!contour.interior && paths.length>0))
					){//if the stroke on the beginning of the contour matches that at the end, connect them
						var pathID=contour.interior?1:0;
						var x=new XML(paths[pathID]);
						var cd1=this._getCurve(cp,contour.orientation).trim();
						var cd2=x['@d'].trim();
						var cd1Points=cd1.split(' ');
						var cd2Points=cd2.split(' ');
						var cd1ep=cd1Points.pop();
						var cd2sp=cd2Points.shift();
						if(cd1ep.replace(/[A-Za-z]/g,'')==cd2sp.replace(/[A-Za-z]/g,'')){
							x['@d']=cd1Points.join(' ')+' '+cd1ep+' '+cd2Points.join(' ');
						}else{
							x['@d']=cd1+' '+cd2;
						}
						if(cd1Points.shift().replace(/[A-Za-z]/g,'')==cd2Points.pop().replace(/[A-Za-z]/g,'')){
							x['@d']+='z';
						}
						paths[pathID]=x.toXMLString()+'\n';
					}else{
						id=this._uniqueID('path');
						idString='id="'+id+'" ';
						paths.push(
							'<path '+
							idString+
							xform+
							'fill="none" '+
							this._getStroke(stroke,{dom:dom})+
							'd="'+this._getCurve(cp,(contour.orientation && paths.length>2)?true:false)+'" '+
							'/>\n'
						);
					}
				}
			}
			var xml;
			id=this._uniqueID('shape');
			xml=new XML('<g id="'+id+'"/>');
			for(var i=0;i<paths.length;i++){
				xml.appendChild(new XML(paths[i]));
			}
			if(ext.log){
				ext.log.pauseTimer(timer);	
			}
			return(xml);
		},
		/**
		 * Build a curve string from an array of arrays of points.
		 * @param {Array} controlPoints
		 * @private {Boolean} close
		 */
		_getCurve:function(controlPoints, close, tuple){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG._getCurve()');	
			}
			close=close!==undefined?close:true;
			if(controlPoints.length==0){
				return;	
			}
			var degPrefix=['M','L','Q','C'];
			var deg=controlPoints[0].length-1;
			var curveString=[degPrefix[0]+controlPoints[0][0].x+","+controlPoints[0][0].y+" "];
			if(deg>0){
				curveString.push(degPrefix[deg]+controlPoints[0][1].x+","+controlPoints[0][1].y+" ");
			}
			if(deg>1){
				curveString.push(controlPoints[0][2].x+","+controlPoints[0][2].y+" ");
			}
			if(deg>2){
				curveString.push(controlPoints[0][3].x+","+controlPoints[0][3].y+" ");
			}
			for(var i=1;i<controlPoints.length;i++){
				var prevdeg=deg;
				deg=controlPoints[i].length-1;
				if(!controlPoints[i][0].is(controlPoints[i-1][prevdeg])){
					prevdeg = (close?"L":"M");
					curveString.push(
						prevdeg+String(controlPoints[i][0].x)+","+
						String(controlPoints[i][0].y)+" "
					);
					if(tuple)tuple.moved = true;
				}
				if(deg!=prevdeg){
					curveString.push(degPrefix[deg]);
				}
				for(var n=1;n<=deg;n++){
					curveString.push(controlPoints[i][n].x+","+controlPoints[i][n].y+(n==deg?"":" "));
				}
				if(
					close && controlPoints[i][deg].is(controlPoints[0][0])
				){
					curveString.push('z ');
					break;
				}else{
					curveString.push(" ");
				}
			}
			if(ext.log){
				ext.log.pauseTimer(timer);	
			}
			return curveString.join('');
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
					xml=<pattern id={this._uniqueID('pattern')} />;
					var image=<image id={this._uniqueID(fillObj.bitmapPath.basename)} />;
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
						var use=<use id={this._uniqueID(fillObj.bitmapPath.basename+'_use')} />;
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
			xml['@id']=id;
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
						dom.defs.appendChild(fill)
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
			svg.push(
				'stroke-linecap="'+(stroke.capType=='none'?'round':stroke.capType)+'"',
				'stroke-linejoin="'+stroke.joinType+'"'
			);
			if(stroke.joinType=='miter'){
				svg.push('stroke-miterlimit="'+stroke.miterLimit+'"');
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
				options.matrix=matrix.concat(tempMatrix.invert()).concat(options.matrix);
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
		_getMatrix:function(matrix){
			if(!(matrix instanceof ext.Matrix)){
				matrix=new ext.Matrix(matrix);
			}
			return([
				'matrix('+String(matrix.a),
				String(matrix.b),
				String(matrix.c),
				String(matrix.d),
				String(matrix.tx),
				String(matrix.ty)+')'
			].join(' '));
		},
		/**
		 * Splits the xml into multiple documents. For use when exporting multiple root timelines.
		 * @private
		 */
		_splitXML:function(inputXML){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG._splitXML()');	
			}
			var documents=new ext.Array();
			var emptyXML=inputXML.copy();
			delete emptyXML.use;
			delete emptyXML.g;
			for each(var e in inputXML.use+inputXML.g){
				var xml=emptyXML.copy();
				element=e.copy();
				if(element.localName()=='use'){
					var id=String(element['@xlink-href']).slice(1);
					var symbol=xml.defs.symbol.(@id==id)[0];
					xml.@viewBox=symbol.@viewBox;
					var dimensions=(String(xml.@viewBox)).match(/[\d\-\.]*[\d\-\.]/g);
					var attrs=['x','y','width','height'];
					for(
						var i=0;
						(
							i<dimensions.length &&
							i<attrs.length
						);
						i++
					){
						xml['@'+attrs[i]]=dimensions[i];
					}
					if(this.includeBackground){
						xml['@enable-background']='new '+String(symbol.@viewBox);
					}
					this.expandUseNow(element, element,false,false,inputXML.defs);
					xml.@id=id;
				}else{
					xml.@id=element.@id;	
				}
				xml.appendChild(element);
				documents.push(xml);
			}
			if(ext.log){
				ext.log.pauseTimer(timer);	
			}
			return documents;
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
			return xml;
		},
		_applyColorEffects:function(xml,defs,colorX){
			var name=xml.localName();
			if( name=='filter' || /Gradient/.test(name) || /Color/.test(name)){
				return;	
			}
			if(name=='mask' && xml..use.length()>0){
				this.expandUseNow( xml, xml,false,true,defs );
			}
			var filter,newFilter;
			var color=colorX;
			if(xml.hasOwnProperty('@filter')){
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
				if(
					!painted &&
					xml.*.length()==(
						xml.animate?xml.animate.length():0+
						xml.animateMotion?xml.animateMotion.length():0+
						xml.animateColor?xml.animateColor.length():0+
						xml.animateTransform?xml.animateTransform.length():0
					)
				){
					var f=this._getFilters(
						null,{color:color},defs
					);
					
					if(xml.hasOwnProperty('@filter') && filter){
						for each(var fe in defs.filter.(@id==f).*){
							filter.appendChild(fe);	
						}
					}else{
						xml.@filter='url(#'+f+')';	
					}
				}
			}
			for each(var element in xml.*){
				this._applyColorEffects(element,defs,color);
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