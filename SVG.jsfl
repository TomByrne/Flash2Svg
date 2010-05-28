(function(ext){
	/**
	 * Creates an SVG formatted image.
	 * @this {extensible.SVG}
	 * @constructor 
	 * @extends Object
	 * @classDescription Creates an SVG formatted image.
	 * @namespace extensible
	 * @type {extensible.SVG}
	 * @return {extensible.SVG}
	 * @extends {extensible.Task}
	 * @parameter {Object} options
	 * @parameter {String} options.outputURI File output URI.
	 * @parameter {String} options.fillGaps If true, adjacent opaque fills will overlap to prevent anti-aliasing artifacts.
	 * @parameter {Number} options.decimalPointPrecision Decimals are rounded to this many places.
	 * @parameter {Boolean} options.expandSymbols If true, symbols are converted to graphic elements for compatibility w/ Illustrator & Webkit browsers.
	 * @parameter {Boolean} applyTransformations If true, matrices are concatenated and applied to child elements for broader compatibility.
	 * @parameter {Number} curveDegree Determines whether curves are created as Quadratic (2) or Cubic (3) beziers - Quadratic is faster.
	 * @parameter {String} maskingType Determines how masks are applied: 'Alpha','Clipping',or 'Luminance'. Clipping mimicks the way flash displays masks. 
	 * @parameter {Boolean} knockoutBackgroundColor If true, shapes that match the background color will serve as a knockout group.
	 * @parameter {Boolean} convertTextToOutlines If true, text is converted to outlines.
	 * @parameter {String} swfPanelName The name of the swfPanel UI.
	 */
	function SVG(options){
		var settings=new ext.Object({
			outputURI:undefined,
			fillGaps:true,
			decimalPointPrecision:3,
			expandSymbols:true,
			applyTransformations:true,
			curveDegree:3,
			maskingType:'Clipping',
			timeline:ext.timeline,
			frame:ext.frame,
			backgroundColor:ext.doc.backgroundColor,
			knockoutBackgroundColor:false,
			includeHiddenLayers:ext.includeHiddenLayers,
			convertTextToOutlines:true,
			includeGuides:false, 
			selection:null,
			matrix:ext.viewMatrix,
			swfPanelName:null,
			id:String(ext.doc.name.stripExtension().camelCase()),
			x:0,y:0,
			width:ext.doc.width,
			height:ext.doc.height,
			docString:'',// W3C recommends ommiting DOCTYPE declarations for SVG.
			version:'1.1',
			baseProfile:'basic',
			log:ext.doc.pathURI.stripExtension()+'.log.csv', // debugging log
			settingsFile:undefined
		});
		settings.extend(options);
		ext.Task.apply(this,[settings]);
		if(typeof(this.curveDegree)=='string'){
			this.curveDegree=['','','Quadratic','Cubic'].indexOf(this.curveDegree);
		}
		this.swfPanel=ext.swfPanel(this.swfPanelName); // the swfPanel
		this.DEFAULT_GRADIENT_LENGTH=819.2; // Pre-transformation length of ALL linear gradients in flash.
		this.DEFAULT_GRADIENT_RADIUS=810.7; // Pre-transformation radius of ALL radial gradients in flash.
		this.MAX_INLINE_CALL_COUNT=2999; // Max recursions
		this.IDENTITY_MATRIX='matrix(1 0 0 1 0 0)';
		this._symbols=new ext.Array([]);
		this._contourCPs=new ext.Object({}); // Holds edge point arrays used in filling gaps.
		this._tempFolder=ext.lib.uniqueName('temp'); // Library folder holding temporary symbols.
		this._ids=new ext.Object({}); // Used by uniqueID() for cross-checking IDs.
		this._progressMax=0;
		this._progress=0;
		this._minProgressIncrement=1; // Is later set to this._progressMax/this.MAX_INLINE_CALL_COUNT in order to prevent recursion
		this._origSelection=new ext.Selection([]);
		this._linearProcessing=true; //If true, a timeline is processed one level deep in it's entirety before progressing to descendants. 
		return this;
	}
	SVG.prototype={
		__proto__:ext.Task,
		/**
		 * @see extensible.Object
		 */
		type:SVG,
		/**
		 * Applies transformation matrices recursively given an SVG graphic element.
		 * @parameter {XML} xml An SVG graphic element or an SVG document. 
		 */
		applyMatrices:function(xml){
			xml=xml!==undefined?xml:this.xml;
			bApplyVertices=true;
			var transform=xml['@transform'];
			var matrix;
			var mxs;
			if(transform){
				transform=String(transform);
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
			for each(var child in xml.*){
				var childName=String(child.name());
				if(matrix){	
					var tr=child['@transform'];
					var nmx;
					var nmxString;
					if(tr){
						tr=String(tr);
						var cmxa=/matrix\(.*?\)/.exec(tr);
						if(cmxa && cmxa.length){
							var cmx=new ext.Matrix(cmxa[0]);
							nmx=cmx.concat(matrix);
							nmxString=this._getMatrix(nmx);
							tr=tr.replace(cmxa[0],nmxString);
						}else{
							tr=mxa[0]+' '+tr;
							nmxString=mxa[0];
							nmx=matrix;
						}
						child['@transform']=tr;
					}else{
						nmx=matrix;
						nmxString=mxa[0];
						child['@transform']=nmxString;
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
								var gradient=this.xml.defs.*.(@id==gradientID);
								if(gradient && gradient.name()=='radialGradient'){
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
								}else if(gradient.name()=='linearGradient'){
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
						if(child.hasOwnProperty('@stroke-width')){
							child['@stroke-width']=Math.roundTo(Number(child['@stroke-width'])*((nmx.scaleX+nmx.scaleY)/2),this.decimalPointPrecision);
						}
					}

				}
				if(childName=='g'){
					this.applyMatrices(child);	
				}
			}
		},
		/**
		 * Begins processing. 
		 * @see extensible.Task
		 */
		begin:function(){
			if(this.settingsFile && !this.swfPanelName){
				this.loadSettings(); // load settings from an xml file
			}
			fl.showIdleMessage(false);
			if(this.que && this.que.isPaused){
				this.que.resumeCmd='begin';
				return;
			}
			if(this.log && typeof(this.log)=='string'){
				ext.startLog({url:this.log});
			}
			if(this.swfPanel){
				this._progressMax=this._getProgressIncrements(this.timeline,this.frame,true);
				this._minProgressIncrement=this._progressMax/this.MAX_INLINE_CALL_COUNT;
			}
			this._origSelection=ext.sel;
			ext.doc.selectNone(); // selection slows performance & can cause crashes
			this.xml=new XML('<svg xmlns:xlink="http://www.w3.org/1999/xlink"/>');
			this.xml['@id']=this.id;
			this.xml['@baseProfile']=this.baseProfile;
			this.xml['@version']=this.version;
			this.xml['@style']="background-color:"+this.backgroundColor;
			this.xml['@x']=String(this.x)+'px';
			this.xml['@y']=String(this.y)+'px';
			this.xml['@width']=String(this.width)+'px';
			this.xml['@height']=String(this.height)+'px';
			var vb=String(this.x)+' '+String(this.y)+' '+String(this.width)+' '+String(this.height);
			this.xml['@viewBox']=vb;
			this.xml['@enable-background']='new '+vb;
			this.xml['@xml:space']='preserve';
			this.xml.appendChild(new XML('<defs/>'));
			var x=this._getTimeline(
				this.timeline,
				{
					matrix:this.matrix,
					frame:this.frame,
					selection:this.selection
				}
			);
			if(this.matrix.is(new ext.Matrix())){ // skip unnecessary identity matrix
				for each(var e in x.*){
					this.xml.appendChild(e);
				}
			}else{
				this.xml.appendChild(x);
			}
			this.process();
		},
		/**
		 * Ends processing.
		 * @see extensible.Task
		 */
		end:function(){
			if(this.expandSymbols || this.baseProfile=='tiny'){ // expand symbol instances
				this.expandUse(this.xml);
				if(this.applyTransformations){
					this.applyMatrices(this.xml);
				}
			}
			this.xml['@xmlns']="http://www.w3.org/2000/svg";
			if(ext.lib.itemExists(this._tempFolder)){ // cleanup temporary items
				ext.lib.deleteItem(this._tempFolder);	
			}
			fl.showIdleMessage(true);
			if(this.log){ext.stopLog();}
			ext.sel=this._origSelection;
			var writeSuccess;
			if(this.outputURI){ 
				writeSuccess=FLfile.write(this.outputURI,String(this));
			}
			var epSuccess;
			if(this.swfPanel){
				epSuccess=this.swfPanel.call('endProgress');	
			}
			if(!epSuccess && this.que){
				return(this.que.next() && writeSuccess);	
			}else{
				return(writeSuccess && epSuccess);
			}
		},
		/**
		 * Expands symbol instances ( use tags ). 
		 * @parameter {XML} xml An svg document or graphic element.
		 */
		expandUse:function(xml){
			for each(var useNode in xml..use){
				if( useNode.name()!='use' || !useNode['@xlink-href'] ){
					continue;
				}
				var id=String(useNode['@xlink-href']).slice(1);
				var symbol=this.xml.defs.symbol.(@id==id)[0];
				this.expandUse(symbol);
				useNode.setName('g');
				for each(var child in symbol.*){
					useNode.appendChild(child);
				}
				useNode['@id']=this._uniqueID(String(symbol['@id']));
				delete useNode['@xlink-href'];
				delete useNode['@width'];
				delete useNode['@height'];
				delete useNode['@x'];
				delete useNode['@y'];
				if(useNode['@transform']==this.IDENTITY_MATRIX){
					delete useNode['@transform'];
				}
				delete this.xml.defs.symbol.(@id==id)[0];
			}
		},
		/**
		 * Loads an xml settings file.
		 * @parameter {String} uri The location of the settings file.
		 */
		loadSettings:function(uri){
			uri=uri||this.settingsFile;
			if(uri && FLfile.exists(uri)){
				var xml=new XML(FLfile.read(uri));
				for each(var x in xml.*){
					var key=String(x.name());
					if(typeof(this[key])=='boolean'){
						this[key]=(
							String(x.valueOf())!=='false' &&
							String(x.valueOf())!=='False' &&
							String(x.valueOf())!=='0'
						);
					}else if(typeof(this[key])=='number'){
						this[key]=Number(x.valueOf());
					}else{
						this[key]=String(x.valueOf());
					}
				}
			}
		},
		/**
		 * Inherited from extensible.Task, this method processes data incrementally, providing the
		 * opportunity for the swfPanel and/or que to update progress or interupt processing if necessary.		 * 
		 * @see extensible.Task
		 */
		process:function(){
			if(this.que && this.que.isPaused){
				this.que.resumeCmd='process';
				return true;
			}
			if(this.qData.length>0){
				if(this.swfPanel){
					var progressGoal=(
						this._progress+this._minProgressIncrement<this._progressMax?
						this._progress+this._minProgressIncrement
						:this._progressMax
					);
				}
				while(
					this.qData.length
					&& ( !this.swfPanel || this._progress<progressGoal )
				){
					var args=this.qData.shift();
					var id=args.shift();
					// e4x filters caused memory errors on larger files
					// so we use a regular expression...
					var elementXML=this._getElement(args[0],args[1]);
					if(elementXML){
						this.xml=new XML(
							this.xml.toXMLString().replace(
								new RegExp('<g.*? id="'+id+'".*?\/>'),
								elementXML.toXMLString()
							)
						);
					}					
				}
				if(this.swfPanel){
					var success=Boolean(
						this.swfPanel.call.attempt(
							this.swfPanel,
							[ 'setProgress', this._progress, this._progressMax ],
							this.MAX_INLINE_CALL_COUNT
						)=='true'
					);
					if(!success){
						ext.warn('Problem communicating with swfPanel.');
						return this.que.process();
					}
				}else{
					return this.que.process();
				}
			}else{
				return this.end();
			}
			return true;
		},
		/**
		 * Retrieves an arbitrary measurement of the time an element
		 * will take to translate, used for passing progress to the swfPanel.
		 * @parameter {extensible.Element} element
		 * @parameter {Number} frame
		 * @parameter {Boolean} recursive
		 */
		_getProgressIncrements:function(element,frame,recursive){
			if(typeof(frame)!='number'){frame=0;}
			var BREAK_TWEEN_VALUE=10;
			var BREAK_TEXT_VALUE=20;
			var ELEMENT_VALUE=5;
			var timeline;
			var increments;
			if(element instanceof Timeline){
				timeline=new ext.Timeline(element);
			}else if(element instanceof ext.Timeline){
				timeline=element;
			}else{
				if(element instanceof ext.SymbolInstance){
					var frame=element.getCurrentFrame(frame);
					var increments=this._getProgressIncrements(
						element.timeline,
						frame,
						recursive
					);
					return increments;
				}else{
					if(element instanceof ext.Shape){
						return  ELEMENT_VALUE+element.numCubicSegments;
					}else if(element instanceof ext.Text || element instanceof ext.TLFText){
						return  ELEMENT_VALUE+BREAK_TEXT_VALUE;
					}else{
						return  ELEMENT_VALUE;
					}
				}
			}
			
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG.getProgressIncrements()');
			}
			if(!timeline.cache.progressIncrements){
				timeline.cache.progressIncrements=[];	
			}
			if(timeline.cache.progressIncrements[frame]){
				return timeline.cache.progressIncrements[settings.frame];
			}
			var frames=timeline.getFrames({
				position:frame,
				includeHiddenLayers:this.includeHiddenLayers,
				includeGuides:this.includeGuides
			});
			increments=ELEMENT_VALUE;
			for(var k=0;k<frames.length;k++){
				if(frames[k].tweenType!=='none'){
					increments+=BREAK_TWEEN_VALUE*frames[k].duration;
				}
				if(recursive){
					var elements=frames[k].elements.expandGroups();
					for(var i=0;i<elements.length;i++){
						increments+=this._getProgressIncrements(
							elements[i],
							frame,
							true
						);
					}
				}
			}
			timeline.cache.progressIncrements[frame]=increments;
			if(ext.log){
				ext.log.pauseTimer(timer);
			}
			return increments;
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
			if(this.swfPanel){
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
			}
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
		/**
		 * Retrieves the SVG data corresponding to a timeline.
		 * @parameter {extensible.timeline) timeline
		 * @parameter {Object} options
		 * @parameter {Number} [options.frame] The frame to process.
		 * @parameter {extensible.Selection} [options.selection] 
		 * @parameter {Number} [id]
		 * @parameter {Matrix} [matrix]
		 * @parameter {Item} [libraryItem] The library item 
		 * @parameter {String} [color] A hexadecimal color value.
		 */
		_getTimeline:function(timeline,options){
			var settings=new ext.Object({
				frame:0,
				selection:undefined,
				id:undefined,
				matrix:new ext.Matrix(),
				libraryItem:undefined,
				color:undefined
			});
			settings.extend(options);
			if(typeof(settings.color)=='string'){ // tint color
				settings.color=new ext.Color(settings.color);
			}
			var hasTweens=false;
			var frames,tempName;
			if(settings.libraryItem){ // it's a symbol
				tempName=this._tempFolder+'/'+settings.libraryItem.name;
			}
			if(tempName && ext.lib.itemExists(tempName)){ // a temporary symbol has already been created
				hasTweens=true;
			}else{
				frames=timeline.getFrames({ // get a list of currently visible frames
					position:settings.frame,
					includeHiddenLayers:this.includeHiddenLayers,
					includeGuides:this.includeGuides
				});
				for(var i=0;i<frames.length;i++){ // check for tweens
					if(
						frames[i].tweenType!='none' &&
						settings.frame!=frames[i].startFrame
					){
						hasTweens=true;
						break;
					}
				}
			}
			var originalScene,timelines;
			if(hasTweens){ // create temporary timelines for converting frames to keyframes
				if(settings.libraryItem==undefined){
					originalScene=timeline.name;
					ext.doc.duplicateScene();
					timelines=ext.doc.timelines;
					timeline=new ext.Timeline(timelines[timelines.length-1]);
				}else{
					if(ext.lib.itemExists(tempName)){
						ext.lib.selectItem(tempName);
					}else{
						if(!ext.lib.itemExists(tempName.dir)){
							ext.lib.addNewItem('folder',tempName.dir);
						}
						ext.lib.selectItem(settings.libraryItem.name);
						ext.lib.duplicateItem();
						ext.lib.moveToFolder(tempName.dir);
						ext.lib.renameItem(tempName.basename);
					}
					timeline=new ext.Timeline(ext.lib.getSelectedItems()[0].timeline);
				}
				var layers=timeline.getLayers();
				var ranges=new ext.Array();
				for(var i=0;i<layers.length;i++){
					var range=new ext.Array();
					var l=layers[i];
					if(l.frameCount>settings.frame){
						var f=l.frames[settings.frame];
						if(f.tweenType!='none'){
							var start=f.startFrame;
							var end=start+f.duration;
							for(
								var i=0;
								i<l.frameCount &&
								end<l.frameCount &&
								l.frames[end].tweenType!='none';
								i++
							){
								var pEnd = end + l.frames[end].duration;
								if (l.frames[pEnd]){
									end=pEnd;
								}else{
									break;
								}
							}
							range.push(start);
							range.push(end);						
						}
					}
					ranges.push(range);
				}
				var success=false;
				success=timeline.convertToKeyframes(ranges);
			}
			if(!settings.selection){ // retrieve elements in the current frames
				var options={
					includeHiddenLayers:this.includeHiddenLayers,
					includeGuides:this.includeGuides
				};
				if(hasTweens){
					options.frame=settings.frame;
				}else{
					options.frames=frames;
				}
				settings.selection=timeline.getElements(options);
			}
			var selection=settings.selection.byFrame({stacked:true});// group elements by layer
			var xml;
			var instanceXML;
			var boundingBox;
			var transformString=this._getMatrix(settings.matrix);
			if(settings.libraryItem){  // create symbol definition if not already available
				var id=settings.libraryItem.name.replace('/','_').camelCase();
				if(settings.frame!=0){
					id+='_'+String(settings.frame);
				}
				if(settings.color){
					id+='_'+settings.color.idString;
				}
				id=this._uniqueID(id);
				var instanceID=this._uniqueID(id);				
				xml=new XML('<use xlink-href="#'+id+'" id="'+instanceID+'" />');
				if(this._symbols.indexOf(id)<0){
					instanceXML=xml;
					instanceXML['@width']=0;
					instanceXML['@height']=0;
					instanceXML['@x']=0;
					instanceXML['@y']=0;
					instanceXML['@transform']=transformString;
					instanceXML['@overflow']="visible";
					this._symbols.push(id);
					xml=new XML('<symbol/>');
					xml['@id']=id;
					boundingBox=new ext.Object({left:0,top:0,right:0,bottom:0});
				}else{
					var vb=String(this.xml.defs.symbol.(@id==id)[0]['@viewBox']).split(' ');
					xml['@width']=vb[2];
					xml['@height']=vb[3];
					xml['@x']=vb[0];
					xml['@y']=vb[1];
					xml['@transform']=transformString;
					xml['@overflow']="visible";
					selection.clear();
				}
			}else{
				id=this._uniqueID('timeline');
				xml=new XML('<g id="'+id+'" />');
				if(settings.matrix && !settings.matrix.is(new ext.Matrix())){
					xml['@transform']=transformString;
				}
			}
			var timelineID=id;
			var masked=new ext.Array();
			for(var i=0;i<selection.length;i++){
				if(selection[i] && selection[i].length>0){
					var layer=selection[i][0].layer;
					var lVisible=layer.visible;
					var lLocked=layer.locked;
					if(!lVisible){layer.visible=true;}
					if(lLocked){layer.locked=false;}
					var layerXML;
					var colorX=settings.color;
					var id=layer.name.camelCase();
					id=this._uniqueID(id);
					if(layer.layerType=='mask'){
						layerXML=new XML('<mask id="'+id+'" />');
						if(this.maskingType=='Alpha'){
							colorX=new ext.Color('#FFFFFF00');  // isolate the alpha channel by tinting the element white 
						}else if(this.maskingType=='Clipping'){
							colorX=new ext.Color('#FFFFFFFF'); // make the mask opaque
						}
					}else if(layer.layerType=='masked'){
						layerXML=new XML('<g id="'+id+'" />');
					}else{
						layerXML=new XML('<g id="'+id+'" />');
					}
					var layerID=id;
					for(var n=0;n<selection[i].length;n++){
						if(boundingBox){ // get the timeline's bounding box
							if(selection[i][n].left<boundingBox.left){boundingBox.left=selection[i][n].left;}
							if(selection[i][n].top<boundingBox.top){boundingBox.top=selection[i][n].top;}
							if(selection[i][n].right>boundingBox.right){boundingBox.right=selection[i][n].right;}
							if(selection[i][n].bottom>boundingBox.bottom){boundingBox.bottom=selection[i][n].bottom;}
						}
						var elementID=this._uniqueID('element');
						var element=new XML('<g id="'+elementID+'"></g>');
						if(this.swfPanel || this._linearProcessing){
							this.qData.push([ // store arguments for later processing
								elementID,
								selection[i][n],
								{
									colorTransform:colorX,
									frame:settings.frame
								}
							]);
						}else{
							var element=this._getElement(
								selection[i][n],{ // get the XML for the element
									colorTransform:colorX,
									frame:settings.frame
								}
							);
						}
						if(element){
							layerXML.appendChild(element);
						}
					}
					if(layer.layerType=='masked'){  // masked layers are grouped together
						masked.push(layerXML);
					}else if(layerXML){
						xml.appendChild(layerXML);
						if(layer.layerType=='mask'){ // masked layers must come after the mask
							var mg=new XML('<g mask="url(#'+id+')"/>');
							for(var m=0;m<masked.length;m++){
								mg.appendChild(masked[m]);
							}
							xml.appendChild(mg);
							masked.clear();
						}
					}
					if(layer.visible!=lVisible){layer.visible=lVisible;}
					if(layer.locked!=lLocked){layer.locked=lLocked;}
				}
			}
			if(originalScene!==undefined){ // this is a temporary scene, delete it and return to the original
				var timelines=ext.timelines;
				ext.doc.deleteScene();
				for(i=0;i<ext.timelines.length;i++){
					if(timelines[i].name==originalScene){
						ext.doc.editScene(i);
						break;	
					}
				}
			}
			var result;
			if(instanceXML){ // set the viewBox
				instanceXML['@width']=String(boundingBox.right-boundingBox.left);
				instanceXML['@height']=String(boundingBox.bottom-boundingBox.top);
				instanceXML['@x']=String(boundingBox.left);
				instanceXML['@y']=String(boundingBox.top);
				xml['@viewBox']=(
					String(boundingBox.left)+' '+
					String(boundingBox.top)+' '+
					String(boundingBox.right-boundingBox.left)+' '+
					String(boundingBox.bottom-boundingBox.top)
				);
				this.xml.defs.appendChild(xml);
				result=instanceXML;
			}else{
				result=xml;
			}
			return result;
		},
		/**
		 * Retrieves the svg data for a symbol instance.
		 * @parameter {extensible.SymbolInstance} instance
		 * @parameter {Object} options
		 * @private
		 */
		_getSymbolInstance:function(instance,options){
			var settings=new ext.Object({
				frame:0,
				matrix:new ext.Matrix(),
				colorTransform:null,
				libraryItem:instance.libraryItem
			});
			settings.extend(options);
			settings.matrix=instance.matrix.concat(settings.matrix);
			var timeline=instance.timeline;
			settings.frame=instance.getCurrentFrame(settings.frame);
			var xml=this._getTimeline(instance.timeline,settings);
			//var filters=this._getFilters(instance,options);
			return xml;
		},
		_getFilters:function(element,options){
			var settings=new ext.Object({
				frame:0
			});
			settings.extend(options);				
		},
		_getBitmapInstance:function(bitmapInstance,options){
			var id=this._uniqueID('bitmap');
			return new XML('<g id="'+id+'" />');
		},
		/**
		 * Retrieves svg data for a Shape Element.
		 * @parameter {extensible.Shape} shape
		 * @parameter {Object} options
		 * @parameter {Matrix} options.matrix
		 * @parameter {extensible.Color} options.colorTransform
		 * @parameter {Number} frame
		 * @parameter {Boolean} fillGaps
		 * @private
		 */
		_getShape:function(shape,options){
			var settings=new ext.Object({
				matrix:new ext.Matrix(),
				colorTransform:null,
				frame:null,
				fillGaps:this.fillGaps
			});
			settings.extend(options);
			var matrix=shape.matrix;
			var descendantMatrix=new ext.Matrix();
			var pathMatrix=null;
			var layerLocked=shape.layer.locked;
			if(shape.isDrawingObject){
				matrix=matrix.concat(settings.matrix);
			}else if(shape.isOvalObject || shape.isRectangleObject){ // ! important
				shape.setTransformationPoint({x:0.0,y:0.0});
				matrix.tx=shape.left;
				matrix.ty=shape.top;
				matrix=matrix.concat(settings.matrix);
				if(shape.objectSpaceBounds.left!=0 || shape.objectSpaceBounds.top!=0){
					pathMatrix=new ext.Matrix({
						tx:-shape.objectSpaceBounds.left,
						ty:-shape.objectSpaceBounds.top}
					);
				}
			}else if(shape.isGroup){
				descendantMatrix=matrix.invert();
				pathMatrix=new ext.Matrix({
					tx:(shape.objectSpaceBounds.left+shape.objectSpaceBounds.right)/2.0,
					ty:(shape.objectSpaceBounds.top+shape.objectSpaceBounds.bottom)/2.0
				});
				pathMatrix=pathMatrix.invert();
				matrix=matrix.concat(settings.matrix);
			}else{
				matrix.tx=shape.left;
				matrix.ty=shape.top;
				matrix=matrix.concat(settings.matrix);
				if(shape.objectSpaceBounds.left!=0 || shape.objectSpaceBounds.top!=0){
					pathMatrix=new ext.Matrix({tx:shape.objectSpaceBounds.left,ty:shape.objectSpaceBounds.top});
					pathMatrix=pathMatrix.invert();
				}
			}
			var contours=shape.contours;
			var svgArray=new ext.Array();
			var filled=new ext.Array();
			var tobeCut=null;
			var fillGaps=false;
			if(settings.fillGaps){ // check for the possibility of gaps
				var filledCount=0;
				for(var i=0;i<contours.length;i++){
					if(contours[i].fill.style!='noFill'){
						filledCount+=1;
						if(filledCount>1){
							fillGaps=true;
							break;
						}
					}
				}
			}
			var ii;
			var validContours=new ext.Array([]);
			for(i=0;i<contours.length;i++){
				var s=this._getContour(contours[i],{
					colorTransform:settings.colorTransform,
					matrix:pathMatrix,
					fillGaps:fillGaps
				});
				if(s){
					validContours.push(contours[i]);
					svgArray.push(s);
					if(contours[i].interior){
						if(filled.length>0 && contours[i].oppositeFill.style!='noFill' ){
							for(var n=filled.length-1;n>-1;n-=1){
								if(contours[i].oppositeFill.is(validContours[filled[n]].fill)){
									if(!contours[i].fill.is(validContours[filled[n]].fill)){
										var cutID=String(svgArray[filled[n]].path[0]['@id']);
										s=this._getContour(contours[i],{
											colorTransform:settings.colorTransform,
											fillGaps:fillGaps,
											reversed:cutID
										});
										if(s){
											var pStr=String(s.path[0]['@d']).trim();
											if(pStr[pStr.length-1]!=='z'){
												pStr+='z';
											}
											svgArray[filled[n]].path[0]['@d']+=/^[^Zz]*[Zz]?/.exec(pStr)[0];
											break;
										}
									}
								}
							}
							if(contours[i].fill.style=='noFill'){
								ii=0;
								for each(n in svgArray[svgArray.length-1].*){
									if(n['@stroke'].length()==0){
										delete svgArray[svgArray.length-1].path[ii];
									}
									ii+=1;
								}
							}
						}
						if(contours[i].fill.style!='noFill'){
							filled.push(svgArray.length-1);
						}
					}
				}
			}
			var id=this._uniqueID('shape');
			var svg=new XML('<g id="'+id+'"/>');
			svg['@transform']=this._getMatrix(matrix);
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
							var index=0;
							for(s in svg){
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
									}
								}
							}
						}
						ii+=1;
					}
					for each(var s in svgArray[i].*){
						svg.appendChild(s);
					}
				}
			}
			if(shape.isGroup && !shape.isDrawingObject){
				var g=shape.members;
				for(i=0;i<g.length;i++){
					var e=this._getElement(g[i],{
						colorTransform:settings.colorTransform,
						matrix:descendantMatrix,
						frame:settings.frame
					})
					if(e){svg.appendChild(e);}
				}
			}
			/**
			 * WIP: Not yet implemented, possibly more problematic than
			 * beneficial. 
			 */
			if(fillGaps){
				var keys=this._contourCPs.keys;
				for(var t=0;t<1;t++){					
					for(i=0;i<keys.length;i++){
						var k=keys[i];
						for(var n=i-1;n>=0;n--){//for(var n=0;n<i;n++){
							var id=keys[n];
							if( // only fill gaps when the foremost shape is opaque
								this._contourCPs[id].fill.style!='noFill' &&
								this._contourCPs[k].fill.style!='noFill' &&
								this._contourCPs[k].fill.isOpaque
							){
								/**
								 * Check to see if the outer region of the anterior shape
								 * fills a hole in the posterior.
								 */
								var plug=-1;
								var plugReversed=false;
								var reversed=this._contourCPs[k][0].getReversed(true);
								for(ii=1;ii<this._contourCPs[id].length;ii++){
									if(
										this._contourCPs[k][0].remove(this._contourCPs[id][ii]).length==0
									){
										plug=ii;
										break;
									}else if(
										reversed.remove(this._contourCPs[id][ii]).length==0
									){
										plugReversed=true;
										plug=ii;
										break;
									}else if(
										this._contourCPs[k][0].filter(
											function(element,index){
												for(var i=0;i<this.length;i++){
													if(
														this[i].edgeID==element.edgeID
													){
														return false;	
													}
												}
												return true;
											},
											this._contourCPs[id][ii]
										).length==0
									){
										plug=ii;
										break;
									}
								}
								var intersected=null;
								var newCPs=new ext.Array(this._contourCPs[id]);					
								if(plug>0){
									newCPs.splice(plug,1);
								}else if(t==0 && !newCPs.fill.is(this._contourCPs[k].fill)){
									intersected=this._intersectCPs(newCPs[0],this._contourCPs[k][0]);
									if(intersected && intersected.length){
										newCPs.shift();
										newCPs.prepend(intersected.areas);
									}
								}
								var newHoleCPs=new ext.Array();
								for(ii=1;ii<this._contourCPs[k].length;ii++){
									newHoleCPs.push(this._contourCPs[k][ii]);
								}
								if(
									(plug && plugReversed && !intersected) ||
									(plug && !plugReversed && intersected)
								){
									for(ii=0;ii<newHoleCPs.length;ii++){
										newHoleCPs[ii].reverse(true);
									}
								}
								if(intersected||plug>-1){
									for(ii=0;ii<newHoleCPs.length;ii++){
										newCPs.push(newHoleCPs[ii]);
									}
									var c=this._getCurve(newCPs[0],true);
									var curve=[];
									if(c){curve.push(c);};
									for(ii=1;ii<newCPs.length;ii++){
										c=this._getCurve(newCPs[ii],true);
										if(c){
											c=/^[^Zz]*[Zz]?/.exec(c.trim())[0];
											curve.push(c);
										}
									}
									c=this._getCurve(intersected.edges[0],true);
									var curve2=[];
									if(c){curve2.push(c);};
									for(ii=1;ii<intersected.edges.length;ii++){
										c=this._getCurve(intersected.edges[ii],true);
										if(c){
											c=/^[^Zz]*[Zz]?/.exec(c.trim())[0];
											curve2.push(c);
										}
									}
									var x=svg..path.(@id==id);
									var gap=new XML('<g id="'+this._uniqueID('gap')+'" />');
									if(x.length()){
										var mask=new XML(
											'<mask/>'
										);
										maskPath['@id']=this._uniqueID('mask');
										var maskPath=new XML(
											'<path fill="#000000"/>'
										);
										maskPath['@id']=this._uniqueID('path');
										maskPath['@d']=curve.join(' ');
										mask.appendChild(maskPath);
										gap.appendChild(mask);
										var edgePath=new XML(
											'<path vector-effect="non-scaling-stroke" stroke-width="1"/>'
										);
										edgePath['@id']=this._uniqueID('path');
										edgePath['@d']=curve2.join(' ');
										edgePath['@stroke']=x[0]['@fill'];
										edgePath['@mask']=mask['@id'];
										gap.appendChild(edgePath);
										x[0].parent().insertChildBefore(x[0],gap);			
									}
								}
							}
						}
					}
				}
				this._contourCPs.clear();
			}
			return svg;		
		},
		/**
		 * Detects intersecting edges and creates overlapping regions to fill gaps.
		 */
		_intersectCPs:function(cp1,cp2){
			var result={
				areas:null,
				edges:null
			};
			var tolerance=.01;
			var origLength=cp1.length;
			var intersected;
			for(var i=0;i<2;i++){
				intersected=cp1.filter(function(element,index){
					for(var i=0;i<this.length;i++){
						if(
							(
								this[i].is(element)
							)||( 
								this[i].edgeID==element.edgeID
							)||( 
								this[i].is(element)
							)
						){
							return true;
						}
					}
					return false;
				},cp2);
				if(intersected.length){
					cp2=cp2.remove(intersected);
					cp1=cp1.remove(intersected);
					break;	
				}else{
					cp2.reverse(true);
				}
				if(i==1){
					cp2=cp2.remove(intersected);
					cp1=cp1.remove(intersected);
					cp2.reverse(true);	
				}
			}
			var cps=[
				cp1.concat(cp2),
				intersected
			];
			if(
				intersected.length
			){
				for(var t=0;t<2;t++){
					var controlPoints=cps[t];
					var orderedCPs=new ext.Array([new ext.Array([controlPoints.shift()])]);
					orderedCPs[orderedCPs.length-1].attributes=cp1.attributes;
					while(controlPoints.length>0){
						var origLength=controlPoints.length;
						var unused=new ext.Array();
						unused.attributes=cp1.attributes;
						for(var i=0;i<controlPoints.length;i++){
							if(
								orderedCPs.at(-1).at(-1).at(-1).is(
									controlPoints[i][0]
								)
							){
								orderedCPs[orderedCPs.length-1].push(
									controlPoints[i]
								);
							}else if(
								orderedCPs.at(-1).at(-1).at(-1).is(
									controlPoints[i].at(-1)
								)
							){
								orderedCPs[orderedCPs.length-1].push(
									controlPoints[i].reversed
								);
							}else if(
								orderedCPs.at(-1)[0][0].is(
									controlPoints[i].at(-1)
								)
							){
								orderedCPs[orderedCPs.length-1].unshift(
									controlPoints[i]
								);
							}else if(
								orderedCPs.at(-1)[0][0].is(
									controlPoints[i][0]
								)
							){
								orderedCPs[orderedCPs.length-1].unshift(
									controlPoints[i].reversed
								);
							}else{
								unused.push(controlPoints[i]);
							}
						}
						controlPoints=unused;
						if(
							controlPoints.length>0 &&
							origLength==controlPoints.length		
						){
							orderedCPs.push(new ext.Array([controlPoints.shift()]));
							orderedCPs[orderedCPs.length-1].attributes=cp1.attributes;
						}
					}
					var controlPoints=new ext.Array([orderedCPs.shift()]);
					while(orderedCPs.length>0){
						if(controlPoints.at(-1).at(-1).at(-1).is(controlPoints.at(-1)[0][0])){
							controlPoints.push(orderedCPs.shift());
						}else{
							var closestDistance=controlPoints.at(-1).at(-1).at(-1).distanceTo(
								controlPoints.at(-1)[0][0]
							);
							var closest=-1;
							var closestEndA=-1;
							var closestEndB=-1;
							for(var i=0;i<orderedCPs.length;i++){
								var distance=orderedCPs[i][0][0].distanceTo(
									controlPoints.at(-1).at(-1).at(-1)
								);
								if(distance<closestDistance){
									closestDistance=distance;
									closest=i;
									closestEndA=1;
									closestEndB=0;
								}
								distance=orderedCPs[i][0][0].distanceTo(
									controlPoints.at(-1)[0][0]
								);
								if(distance<closestDistance){
									closestDistance=distance;
									closest=i;
									closestEndA=0;
									closestEndB=0;
								}
								distance=orderedCPs[i].at(-1).at(-1).distanceTo(
									controlPoints.at(-1).at(-1).at(-1)
								);
								if(distance<closestDistance){
									closestDistance=distance;
									closest=i;
									closestEndA=1;
									closestEndB=1;
								}
								distance=orderedCPs[i].at(-1).at(-1).distanceTo(
									controlPoints.at(-1)[0][0]
								);
								if(distance<closestDistance){
									closestDistance=distance;
									closest=i;
									closestEndA=0;
									closestEndB=1;
								}
								
							}
							if(closest==-1 || tolerance>closest){
								controlPoints.push(orderedCPs.shift());
							}else{
								var matched=orderedCPs[closest];
								if(closestEndA==closestEndB){
									matched.reverse(true);
								}
								if(closestEndA==1){
									controlPoints[controlPoints.length-1].extend(matched);
								}else{
									controlPoints[controlPoints.length-1].prepend(matched);
								}
								orderedCPs.splice(closest,1);
							}						
						}
					}
					if(t==0){
						orderedCPs.clear();
						for(i=0;i<controlPoints.length;i++){
							if(controlPoints[i].at(-1).at(-1).is(controlPoints[i][0][0])){
								orderedCPs.push(controlPoints[i]);
							}
						}
						controlPoints=orderedCPs;
						result.areas=controlPoints;
					}else{
						result.edges=controlPoints;
					}
				}
				return result;
			}else{
				return;	
			}
		},
		_getContour:function(contour,options){
			var settings=new ext.Object({
				matrix:null,
				reversed:false,
				colorTransform:null,
				fillGaps:false
			});
			settings.extend(options);
			var controlPoints=contour.getControlPoints({
				curveDegree:this.curveDegree,
				reversed:settings.reversed,
				fillGaps:settings.fillGaps
			});
			if(!controlPoints || controlPoints.length==0){
				return;
			}
			var fills=new ext.Array();
			var paths=new ext.Array();
			var interior=false;
			var xform='';
			if(settings.matrix){
				xform='transform="'+this._getMatrix(settings.matrix)+'" ';
			}	
			var id,idString;
			if(contour.interior){//Construct a curve for the enclosed shape if present.
				interior=true;
				var fillString='none';
				var opacityString='1';
				var fill=this._getFill(contour.fill,{
					shape:contour.shape
				});
				if(fill){
					if(fill.name()=='solidColor'){
						fillString=String(fill['@solid-color']);
						opacityString=String(fill['@solid-opacity']);
						//this._ids.pop();
					}else{
						//fills.push(fill);
						this.xml.defs.appendChild(fill)
						fillString='url(#'+String(fill['@id'])+')';
					}
				}
				var cdata;
				cdata=this._getCurve(controlPoints,true);
				id=this._uniqueID('path');
				idString='id="'+id+'" ';
				if(settings.fillGaps){
					if(settings.reversed!==false){
						this._contourCPs[settings.reversed].push(controlPoints);
					}else if(contour.fill.style!='noFill'){
						this._contourCPs[id]=new ext.Array([controlPoints]);
						this._contourCPs[id].fill=contour.fill;
					}
				}
				paths.push('<path  '+idString+xform+'fill="'+fillString+'" fill-opacity="'+opacityString+'" d="'+cdata+'"/>\n');
			}
			var hasStroke=false;
			if(controlPoints.length>0 && !settings.reversed){//Create a contour for each length of contiguous edges w/ the same stroke attributes. Skipped for settings.reversed, which is only used for creating hollows.
				var cp=new ext.Array([]);
				var stroke=null;
				var firstEdge=controlPoints[0][0].edge;
				if(firstEdge.stroke && firstEdge.stroke.style!='noStroke'){
					hasStroke=true;
					cp.push(controlPoints[0]);
					stroke=firstEdge.stroke;
				}
				for(i=1;i<controlPoints.length;i++){
					var edge=controlPoints[i][0].edge;
					if(edge.stroke && edge.stroke.style!='noStroke'){
						if(stroke!==null && edge.stroke.is(stroke)){
							cp.push(controlPoints[i]);
						}else{
							if(stroke && cp.length>0){
								id=this._uniqueID('path');
								idString='id="'+id+'" ';
								paths.push(
									'<path '+
									idString+
									xform+
									'fill="none" '+
									this._getStroke(stroke)+
									'd="'+this._getCurve(cp,false)+'" '+
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
								this._getStroke(stroke)+
								'd="'+this._getCurve(cp,false)+'" '+
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
						&& ((interior && paths.length>1) || (!interior && paths.length>0))
					){//if the stroke on the beginning of the contour matches that at the end, connect them
						var pathID=interior?1:0;
						var x=new XML(paths[pathID]);
						var cd1=this._getCurve(cp,false).trim();
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
							this._getStroke(stroke)+
							'd="'+this._getCurve(cp,(contour.interior && paths.length<2))+'" '+
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
			return(xml);
		},
		_getCurve:function(controlPoints,close){
			close=close!==undefined?close:true;
			//while(!controlPoints[0] || !controlPoints[0][0] && controlPoints.length){
			//	if(controlPoints[0] && controlPoints[0].length){
			//		controlPoints[0].shift();
			//	}else{
			//		controlPoints.shift();
			//	}
			//}
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
				var m=false;
				if(!controlPoints[i][0].is(controlPoints[i-1][prevdeg])){
					m=true;
					curveString.push(
						"L"+String(controlPoints[i][0].x)+","+
						String(controlPoints[i][0].y)+" "
					);
				}
				if(deg!=prevdeg || m){curveString.push(degPrefix[deg]);}
				for(var n=1;n<=deg;n++){
					curveString.push(controlPoints[i][n].x+","+controlPoints[i][n].y+(n==deg?"":" "));
				}
				if(
					close && 
					controlPoints[i][deg].is(controlPoints[0][0])
				){
					curveString.push('z ');
					break;
				}else{
					curveString.push(" ");
				}
			}
			return curveString.join('');
		},
		_getFill:function(fillObj,options){
			var settings=new ext.Object({
				shape:undefined,
				gradientUnits:'userSpaceOnUse' // objectBoundingBox, userSpaceOnUse
			});
			settings.extend(options);
			if(typeof fillObj=='string'){
				fillObj=new ext.Fill(fillObj);
			}else if(fillObj.style=='noFill'){
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
					if(!shape){return;}
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
							stop['@offset']=String(Math.roundTo((fillObj.posArray[i]/255.0)*100,this.decimalPointPrecision))+'%';
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
					xml=new XML('<pattern/>');
					break;
				case 'solid':
					var color=new ext.Color(fillObj.color);
					xml=new XML('<solidColor/>');
					xml['@solid-color']=color.hex;
					xml['@solid-opacity']=color.opacity;
					break;
			}
			xml['@id']=id;
			return xml;
		},
		_getStroke:function(stroke,options){
			var color=new ext.Color(stroke.color);
			var svg='';
			//if(stroke.fill && stroke.fill!='noFill'){
				
			//}else{
				svg+='stroke="'+color.hex+'" ';
				svg+='stroke-opacity="'+String(color.opacity)+'" ';
			//}
			svg+='stroke-width="'+stroke.thickness+'" ';
			svg+='stroke-linecap="'+(stroke.capType=='none'?'round':stroke.capType)+'" ';
			svg+='stroke-linejoin="'+stroke.joinType+'" ';
			if(stroke.joinType=='miter'){svg+='stroke-miterlimit="'+stroke.miterLimit+'" ';}
			
			if(stroke.scaleType=='none'){
				svg+='vector-effect="non-scaling-stroke" ';
			}
			return svg;
		},
		_getText:function(element,options){
			var settings=new ext.Object({});
			settings.extend(options);
			if(this.convertTextToOutlines){
				var timeline=element.timeline;
				var frame=settings.frame||element.frame;
				var layer=element.layer;
				var index=element.frame.elements.expandGroups().indexOf(element);
				var matrix=element.matrix;
				var id=element.uniqueDataName(String('temporaryID_'+String(Math.floor(Math.random()*9999))));
				var pd=Math.floor(Math.random()*99999999);
				element.setPersistentData(id,'integer',pd);
				timeline.setSelectedLayers(layer.index);
				timeline.copyFrames(frame.startFrame);
				var currentTimeline=ext.timeline;
				currentTimeline.setSelectedLayers(currentTimeline.layerCount-1);
				var tempLayerIndex=currentTimeline.addNewLayer('temp','normal',false);
				currentTimeline.setSelectedLayers(tempLayerIndex);
				currentTimeline.pasteFrames(0);
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
				for(i=0;i<searchElements.length;i++){
					if(
						searchElements[i].hasPersistentData(id) &&
						searchElements[i].getPersistentData(id)==pd
					){
						tempElement=searchElements[i];
					}else{
						ext.sel=[searchElements[i]];
						ext.doc.deleteSelection();
					}
				}
				tempElement.matrix=new ext.Matrix();
				ext.sel=[tempElement];
				while(ext.sel.length==0){
					ext.doc.exitEditMode();
					ext.sel=[tempElement];
				}
				ext.doc.breakApart();
				ext.doc.breakApart();
				options.matrix=matrix.concat(options.matrix);
				var xml=this._getShape(currentTimeline.layers[tempLayerIndex].elements[0],options);
				currentTimeline.deleteLayer(tempLayerIndex);
				element.removePersistentData(id);
				return xml;
			}	
		},
		_getMatrix:function(matrix){
			if(!(matrix instanceof ext.Matrix)){
				matrix=new ext.Matrix(matrix);
			}
			return('matrix('+matrix.a+' '+matrix.b+' '+matrix.c+' '+matrix.d+' '+matrix.tx+' '+matrix.ty+')');
		},
		_uniqueID:function(id,xml){
			id=id.trim().camelCase();
			if(!id || !id.length){
				id='g';
			}else if(/^[^A-Za-z\d]/.test(id)){
				id='g'+id;
			}
			var parts=/(.*[^\d])([\d][\d]*$)?/.exec(id);
			var base=parts[1];
			var increment=0;
			if(parts.length>2){
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
		toString:function(){
			return this.docString+this.xml.toXMLString().replace(/(<use.*?)xlink-href="#/g,'$1xlink:href="#');
		}
	}
	ext.extend({SVG:SVG});
})(extensible);