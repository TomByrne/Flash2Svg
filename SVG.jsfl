
(function(ext){
	/*
	 * @this {extensible.SVG}
	 * @extends extensible.Object
	 * @constructor
	 * @param {Object} options
	 */
	function SVG(options){
		var settings=new ext.Object({
			settingsFile:ext.dir+'/Settings/SVG/default.xml', // xml settings file
			fillGaps:true,
			decimalPointPrecision:3,
			expandSymbols:true, // if true, symbols are converted to graphic elements for compatibility w/ Illustrator & Webkit browsers
			applyTransformations:true,
			curveDegree:3, // determines whether curves are created as Quadratic (2) or Cubic (3) beziers - Quadratic is faster
			maskingType:'Clipping', // determines how masks are applied: 'Alpha','Clipping',or 'Luminance'. Clipping mimicks the way flash displays masks.
			timeline:ext.timeline, // root timeline - defaults to the currently open timeline
			frame:ext.frame, // current frame index - defaults to the current frame
			backgroundColor:ext.doc.backgroundColor,
			knockoutBackgroundColor:false, // if true, shapes that match the background color will serve as a knockout group
			includeHiddenLayers:ext.includeHiddenLayers,
			convertTextToOutlines:true,
			includeGuides:false,
			selection:null, // An ext.Selection object. Limits content to the specified elements.
			matrix:ext.viewMatrix, // The matrix applied to the root element, defaults to the current viewMatrix.
			id:String(ext.doc.name.stripExtension().camelCase()), // root element ID
			x:0,y:0, // root element registration point
			width:ext.doc.width, // Document width.
			height:ext.doc.height, // Document height.
			docString:( // Header & DOCTYPE
				'<?xml version="1.0" encoding="utf-8"?>\n'+
				'<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n'
			),
			version:'1.1', // SVG Version
			baseProfile:'basic',
			log:undefined // URI for writing a log
		});
		settings.extend(options);
		ext.Object.apply(this,[settings]);
		if(typeof(this.curveDegree)=='string'){
			this.curveDegree=['','','Quadratic','Cubic'].indexOf(this.curveDegree);
		}
		this.loadSettings();
		this._defaultGradientLength=819.2;//Pre-transformation length of ALL linear gradients in flash.
		this._defaultGradientRadius=810.7;//Pre-transformation radius of ALL radial gradients in flash.
		this._identityMatrix='matrix(1 0 0 1 0 0)';
		this._symbols=new ext.Array([]);
		this._contourCPs=new ext.Object({});
		this._ids=new ext.Array([]);
		this._tempFolder=ext.lib.uniqueName('temp');
		this.getSVG();
		return this;
	}
	SVG.prototype={
		__proto__:ext.Object,
		type:SVG,
		loadSettings:function(url){
			url=url||this.settingsFile;
			if(FLfile.exists(url)){
				var xml=new XML(FLfile.read(url));
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
		getSVG:function(){
			if(this.log && typeof(this.log)=='string'){
				ext.startLog({url:this.log});
			}
			//ext.progressbar=new ext.ProgressBar('SVG Exporter',{max:this.timeline.getNumCubicSegments()});
			var origSelection=ext.sel;
			ext.doc.selectNone(); // selection slows performance & can cause crashes
			fl.showIdleMessage(false);
			this.xml=new XML('<svg xmlns:xlink="http://www.w3.org/1999/xlink"/>');
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
			var x=this.getTimeline(this.timeline,{
				matrix:this.matrix,
				frame:this.frame,
				selection:this.selection
			});
			if(this.matrix.is(new ext.Matrix())){ // skip unnecessary identity matrix
				for each(var e in x.*){
					this.xml.appendChild(e);
				}
			}else{
				this.xml.appendChild(x);
			}
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
			//ext.progressbar.complete();
			ext.sel=origSelection;
			return this.xml;
		},
		getTimeline:function(timeline,options){
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
				timeline.convertToKeyframes(ranges);
			}
			if(!settings.selection){ // get elements in the currently visible frames
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
			var selection=settings.selection.byFrame({stacked:true}); // group elements by layer
			var xml;
			var instanceXML;
			var boundingBox;
			var transformString=this.getMatrix(settings.matrix);
			if(settings.libraryItem){  // create symbol definition if not already available
				var id=settings.libraryItem.name.replace('/','_').camelCase();
				if(settings.frame!=0){
					id+='_'+String(settings.frame);
				}
				if(settings.color){
					id+='_'+settings.color.idString;
				}
				try{
					id=this.uniqueID(id);
				}catch(e){
					throw new Error('\nextensible.SVG.getTimeline() - 1\n\t'+id+'\n\t'+String(e));
				}
				try{
					var instanceID=this.uniqueID(id);
				}catch(e){
					throw new Error('\nextensible.SVG.getTimeline() - 2\n\t'+id+'\n\t'+String(e));
				}
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
				xml=new XML('<g/>');
				if(settings.matrix && !settings.matrix.is(new ext.Matrix())){
					xml['@transform']=transformString;
				}
			}
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
					try{
						id=this.uniqueID(id);
					}catch(e){
						throw new Error('\nextensible.SVG.getTimeline() - 3\n\t'+id+'\n\t'+String(e));
					}
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
					for(var n=0;n<selection[i].length;n++){
						if(boundingBox){ // get the timeline's bounding box
							if(selection[i][n].left<boundingBox.left){boundingBox.left=selection[i][n].left;}
							if(selection[i][n].top<boundingBox.top){boundingBox.top=selection[i][n].top;}
							if(selection[i][n].right>boundingBox.right){boundingBox.right=selection[i][n].right;}
							if(selection[i][n].bottom>boundingBox.bottom){boundingBox.bottom=selection[i][n].bottom;}
						}
						var element=this.getElement(selection[i][n],{ // get the XML for the element
							colorTransform:colorX,
							frame:settings.frame
						});
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
				return instanceXML;
			}else{
				return xml;
			}
		},
		getElement:function(element,options){
			if(element instanceof ext.Shape){
				return this.getShape(element,options);
			}else if(
				element instanceof ext.Text || 
				element instanceof ext.TLFText
			){
				return this.getText(element,options);
			}else if(element instanceof ext.Instance){
				if(element.instanceType=='symbol'){return this.getSymbolInstance(element,options);}
				if(element.instanceType=='bitmap'){return this.getBitmapInstance(element,options);}
			}
			
		},
		getSymbolInstance:function(instance,options){
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
			var xml=this.getTimeline(instance.timeline,settings);
			return xml;
		},
		getBitmapInstance:function(bitmapInstance,options){
			return new XML('<g/>');
		},
		getShape:function(shape,options){
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
			}else if(shape.isOvalObject || shape.isRectangleObject){
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
			if(settings.fillGaps){ // check for possible gaps to fill
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
			for(i=0;i<contours.length;i++){
				var s=this.getContour(contours[i],{
					colorTransform:settings.colorTransform,
					matrix:pathMatrix,
					fillGaps:fillGaps
				});
				if(s){
					svgArray.push(s);
					if(contours[i].interior){
						if(filled.length>0 && contours[i].oppositeFill.style!='noFill' ){
							for(var n=filled.length-1;n>-1;n-=1){
								if(contours[i].oppositeFill.is(contours[filled[n]].fill)){
									if(!contours[i].fill.is(contours[filled[n]].fill)){
										var cutID=String(svgArray[filled[n]].path[0]['@id']);
										s=this.getContour(contours[i],{
											colorTransform:settings.colorTransform,
											fillGaps:fillGaps,
											reversed:cutID
										});
										if(s){
											svgArray[filled[n]].path[0]['@d']+=/^[^Zz]*[Zz]?/.exec(s.path[0]['@d'].trim())[0];
											break;
										}
									}
								}
							}
							if(contours[i].fill.style=='noFill'){
								for each(n in svgArray[svgArray.length-1].*){
									if(n.stroke.length()==0){
										delete n;
									}
								}
							}
						}
						if(contours[i].fill.style!='noFill'){
							filled.push(i);
						}
					}
				}
			}
			var svg=new XML('<g/>');
			svg['@transform']=this.getMatrix(matrix);
			for(var i=0;i<svgArray.length;i++){
				if(svgArray[i].*.length()){//eliminate duplicate paths
					for each(n in svgArray[i].*){
						if(
							n.localName()=='path' && 
							(!n['@stroke'].length() || n['@stroke']=='none' || n['@stroke']=='') && 
							(!n['@fill'].length() || n['@fill']=='none' || n['@fill']=='')
						){
							delete n;
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
					}
					for each(var s in svgArray[i].*){
						svg.appendChild(s);
					}
				}
			}
			if(shape.isGroup && !shape.isDrawingObject){
				var g=shape.members;
				for(i=0;i<g.length;i++){
					var e=this.getElement(g[i],{
						colorTransform:settings.colorTransform,
						matrix:descendantMatrix,
						frame:settings.frame
					})
					if(e){svg.appendChild(e);}
				}
			}
			//fill gaps
			/*
			if(fillGaps){
				var keys=this._contourCPs.keys;//.reversed;
				for(i=0;i<keys.length;i++){
					var k=keys[i];
					for(var n=0;n<i;n++){
					//for(var n=i-1;n>=0;n--){
					//for(var n=i+1;n<keys.length;n++){
					//for(var n=keys.length-1;n>i;n--){
						var id=keys[n];
						if(
							this._contourCPs[id].fill.style!='noFill' &&
							this._contourCPs[k].fill.style!='noFill' &&
							this._contourCPs[k].fill.isOpaque
						){
							var hCheck,intersected;
							hCheck=this._contourCPs[id].indexOf(this._contourCPs[k][0]);
							if(hCheck>0){
								this._contourCPs[id].splice(hCheck,1);
							}else if(!this._contourCPs[id].fill.is(this._contourCPs[k].fill)){
								//intersected=this.intersectCPs(this._contourCPs[id][0],this._contourCPs[k][0]);
								if(intersected && intersected.length){
									this._contourCPs[id].shift();
									this._contourCPs[id].prepend(intersected);
								}
							}
							if(intersected||hCheck>-1){
								for(ii=1;ii<this._contourCPs[k].length;ii++){
									this._contourCPs[id].push(this._contourCPs[k][ii]);//.getReversed(true)
								}
								var c=this.getCurve(this._contourCPs[id][0],true);
								var curve=[];
								if(c){
									curve.push(c);
								};
								for(ii=1;ii<this._contourCPs[id].length;ii++){
									c=this.getCurve(this._contourCPs[id][ii],true);
									if(c){
										//c=/^[^Zz]*[Zz]?/.exec(c.trim())[0];
										curve.push(c);
									}
								}
								var x=svg..path.(@id==id);
								if(x.length() && curve.length){
									x[0]['@d']=curve.join(' ');
								}
							}
						}
					}
				}
			}
			this._contourCPs.clear();
			*/
			return svg;		
		},
		intersectCPs:function(cp1,cp2){
			//cp2.reverse(true);
			
			
			/*
			var e1IDs=new ext.Array();
			for(var i=0;i<cp1.length;i++){
				e1IDs.push(cp1[i].edgeID);
			}
			var e2IDs=new ext.Array();
			for(var i=0;i<cp2.length;i++){
				e2IDs.push(cp2[i].edgeID);
			}
			*/
			var intersected=cp1.intersect(cp2);
			if(!intersected.length){
				//e2IDs.reverse(true);
				cp2.reverse(true);
				intersected=cp1.intersect(cp2);
			}
			if(intersected.length){
				
				var cp1n=new ext.Array([new ext.Array([])]);
				var n=0;
				var bLastIx=true;
				for(var i=0;i<cp1.length;i++){
					if(cp2.indexOf(cp1[i])!=-1 && !bLastIx){
						cp1n.push(new ext.Array([]));
						n+=1;
						bLastIx=true;
					}else{
						cp1n[n].push(cp1[i]);
						bLastIx=false;
					}
				}
				if(!cp1n.at(-1).length){
					cp1n.pop();
				}
				var cp2n=new ext.Array([new ext.Array([])]);
				var n=0;
				var bLastIx=true;
				for(i=0;i<cp2.length;i++){
					if(cp1.indexOf(cp1[i])!=-1 && !bLastIx){
						cp2n.push(new ext.Array([]));
						n+=1;
						bLastIx=true;
					}else{
						cp2n[n].push(cp2[i]);
						bLastIx=false;
					}
				}
				if(!cp2n.at(-1).length){
					cp2n.pop();
				}
				if(cp1n[0][0][0].is(cp1n.at(-1).at(-1).at(-1))){
					cp1n[0]=cp1n.at(-1).concat(cp1n[0]);
					cp1n.pop();
				}
				if(cp2n[0][0][0].is(cp2n.at(-1).at(-1).at(-1))){
					cp2n[0]=cp2n.at(-1).concat(cp2n[0]);
					cp2n.pop();
				}
				for(i=0;i<cp1n.length;i++){
					for(n=0;n<cp2n.length;n++){
						if(cp1n[i].at(-1).at(-1).is(cp2n[n][0][0])){
							cp1n[i].extend(cp2n[n]);
							break;
						}else if(cp1n[i][0][0].is(cp2n[n].at(-1).at(-1))){
							cp1n[i].prepend(cp2n[n]);
							break;
						}
					}
				}
				var ct=new ext.Array([cp1n.shift()]);
				var n=0;
				while(cp1n.length>0){
					var found=false;
					var cp1nT=new ext.Array(cp1n);
					cp1nT.clear();
					for(i=0;i<cp1n.length;i++){
						if(ct[n].at(-1).at(-1).is(cp1n[i][0][0])){
							ct[n].extend(cp1n[i]);
							cp1n.splice(i,1);
							found=true;
						}else if(ct[n][0][0].is(cp1n[i].at(-1).at(-1))){
							ct[n].prepend(cp1n[i]);
							cp1n.splice(i,1);
							found=true;fl.('found');
						}else {
							var rev=cp1n[i].getReversed(true);
							if(ct[n].at(-1).at(-1).is(rev[0][0])){
								ct[n].extend(rev);
								cp1n.splice(i,1);
								found=true;
							}else if(ct[n][0][0].is(rev.at(-1).at(-1))){
								ct[n].prepend(rev);
								cp1n.splice(i,1);
								found=true;
							}else{
								cp1nT.push(cp1n[i]);
							}
						}
					}
					cp1n=cp1nT;
					if(!found){
						ct.push(cp1n.shift());
						n+=1;
					}				
				}
				return ct;
			}
		},
		getContour:function(contour,options){
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
				xform='transform="'+this.getMatrix(settings.matrix)+'" ';
			}	
			var id,idString;
			if(contour.interior){//Construct a curve for the enclosed shape if present.
				interior=true;
				var fillString='none';
				var opacityString='1';
				var fill=this.getFill(contour.fill,{
					shape:contour.shape
				});
				if(fill){
					if(fill.name()=='solidColor'){
						fillString=String(fill['@solid-color']);
						opacityString=String(fill['@solid-opacity']);
						this._ids.pop();
					}else{
						//fills.push(fill);
						this.xml.defs.appendChild(fill)
						fillString='url(#'+String(fill['@id'])+')';
					}
				}
				var cdata;
				cdata=this.getCurve(controlPoints,true);
				try{
					id=this.uniqueID('path');
				}catch(e){
					throw new Error('\nextensible.SVG.getContour() - 1\n\tpath\n\t'+String(e));
				}				
				idString='id="'+id+'" ';
				if(settings.fillGaps){
					if(settings.reversed){
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
								try{
									id=this.uniqueID('path');
								}catch(e){
									throw new Error('\nextensible.SVG.getContour() - 2\n\tpath\n\t'+String(e));
								}
								idString='id="'+id+'" ';
								paths.push(
									'<path '+
									idString+
									xform+
									'fill="none" '+
									this.getStroke(stroke)+
									'd="'+this.getCurve(cp,false)+'" '+
									'/>\n'
								);
							}
							stroke=edge.stroke;
							cp=new ext.Array([controlPoints[i]]);
						}
					}else{
						if(stroke && cp.length>0){
							try{
								id=this.uniqueID('path');
							}catch(e){
								throw new Error('\nextensible.SVG.getContour() - 3\n\tpath\n\t'+String(e));
							}
							idString='id="'+id+'" ';
							paths.push(
								'<path '+
								idString+
								xform+
								'fill="none" '+
								this.getStroke(stroke)+
								'd="'+this.getCurve(cp,false)+'" '+
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
						var cd1=this.getCurve(cp,false).trim();
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
						try{
							id=this.uniqueID('path');
						}catch(e){
							throw new Error('\nextensible.SVG.getContour() - 4\n\tpath\n\t'+String(e));
						}
						idString='id="'+id+'" ';
						paths.push(
							'<path '+
							idString+
							xform+
							'fill="none" '+
							this.getStroke(stroke)+
							'd="'+this.getCurve(cp,(contour.interior && paths.length<2))+'" '+
							'/>\n'
						);
					}
				}
			}
			var xml;
			xml=new XML('<g/>');
			for(var i=0;i<paths.length;i++){
				xml.appendChild(new XML(paths[i]));
			}
			return(xml);
		},
		getCurve:function(controlPoints,close){
			close=close!==undefined?close:true;
			/*
			while(!controlPoints[0] || !controlPoints[0][0] && controlPoints.length){
				if(controlPoints[0] && controlPoints[0].length){
					controlPoints[0].shift();
				}else{
					controlPoints.shift();
				}
			}
			*/
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
				//if(i==controlPoints.length-1 && close){//  
				if(controlPoints[i][deg].x==controlPoints[0][0].x && controlPoints[i][deg].y==controlPoints[0][0].y && close){
					curveString.push('z ');
					break;
				}else{
					curveString.push(" ");
				}
			}
			return curveString.join('');
		},
		getFill:function(fillObj,options){
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
			try{
				id=this.uniqueID(fillObj.style);
			}catch(e){
				throw new Error('\nextensible.SVG.getFill() - 1\n\t'+fillObj.style+'\n\t'+String(e));
			}
			var xml,defaultMeasurement;
			var shape=settings.shape;
			var matrix=fillObj.matrix;
			switch(fillObj.style){
				case 'linearGradient':
					defaultMeasurement=this._defaultGradientLength;
				case 'radialGradient':
					defaultMeasurement=defaultMeasurement||this._defaultGradientRadius;
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
							stop['@offset']=String((fillObj.posArray[i]/255.0)*100)+'%';
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
							xml['@gradientTransform']=this.getMatrix(matrix);
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
		getStroke:function(stroke,options){
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
		getText:function(element,options){
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
				var xml=this.getShape(currentTimeline.layers[tempLayerIndex].elements[0],options);
				currentTimeline.deleteLayer(tempLayerIndex);
				element.removePersistentData(id);
				return xml;
			}	
		},
		getMatrix:function(matrix){
			if(!(matrix instanceof ext.Matrix)){
				matrix=new ext.Matrix(matrix);
			}
			return('matrix('+matrix.a+' '+matrix.b+' '+matrix.c+' '+matrix.d+' '+matrix.tx+' '+matrix.ty+')');
		},
		applyMatrices:function(g){
			g=g!==undefined?g:this.xml;
			bApplyVertices=true;
			var transform=g['@transform'];
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
					delete g['@transform'];
				}else{
					g['@transform']=transform;
				}
			}
			for each(var child in g.*){
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
							nmxString=this.getMatrix(nmx);
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
									var gmxString=this.getMatrix(gmx);
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
		expandUse:function(xml){
			xml=xml||this.xml;
			if(this.convertStrokesToSymbols){
				var useList=new ext.Array();
				for each(var use in xml..use){
					useList.unshift(use);
				}
				for(var i=0;i<useList.length;i++){
					use=useList[i];
					var id=String(use['@xlink-href']).slice(1);
					var symbol=this.xml.defs.symbol.(@id==id)[0];
					if(symbol..use.length()!=0){continue;}
					var symbol=this.expandUse(symbol);
					use.setName('g');
					for each(child in symbol.*){
						use.appendChild(child);	
					}		
					try{
						use['@id']=this.uniqueID(String(symbol['@id']));
					}catch(e){
						throw new Error('\nextensible.SVG.getFill() - 1\n\t'+String(symbol['@id'])+'\n\t'+String(e));
					}
					delete use['@xlink-href'];
					delete use['@width'];
					delete use['@height'];
					delete use['@x'];
					delete use['@y'];
					if(use['@transform']==this._identityMatrix){
						delete use['@transform'];
					}
					delete this.xml.defs.symbol.(@id==id)[0];
				}
				return xml;
			}else{
				for each(var use in xml..use){
					var id=String(use['@xlink-href']).slice(1);
					var symbol=this.xml.defs.symbol.(@id==id)[0];
					var symbol=this.expandUse(symbol);
					use.setName('g');
					for each(child in symbol.*){
						use.appendChild(child);	
					}		
					try{
						use['@id']=this.uniqueID(String(symbol['@id']));
					}catch(e){
						throw new Error('\nextensible.SVG.getFill() - 1\n\t'+String(symbol['@id'])+'\n\t'+String(e));
					}
					delete use['@xlink-href'];
					delete use['@width'];
					delete use['@height'];
					delete use['@x'];
					delete use['@y'];
					if(use['@transform']==this._identityMatrix){
						delete use['@transform'];
					}
					delete this.xml.defs.symbol.(@id==id)[0];
				}
				return xml;
			}
		},
		idExists:function(svgID,xml){
			try{
				if(this._ids.indexOf(svgID)>-1){
					return true;
				}
			}catch(e){
				throw new Error('\nextensible.SVG.idExists()\n\t'+String(e));
			}
			return false;
		},
		uniqueID:function(svgID,xml){
			var orig=svgID;
			svgID=svgID.trim();
			svgID=svgID.camelCase();
			if(!svgID || !svgID.length){
				svgID='g';
			}
			if(/^[^A-Za-z]/.test(svgID)){
				svgID='g'+svgID;
			}
			try{
				var idExists=this.idExists(svgID,xml)
			}catch(e){
				throw new Error('\nextensible.SVG.uniqueID()\n\t'+String(e));
			}
			if(idExists){
				if(/[\d][\d]*$/.test(svgID)){
					return this.uniqueID(svgID.replace(/[\d][\d]*$/,String(Number(/[\d][\d]*$/.exec(svgID)[0])+1)),xml);
				}else{
					return  this.uniqueID(svgID+"_1",xml);
				}
			}
			this._ids.push(svgID);
			return svgID;
		},
		toString:function(){
			return this.docString+'\n'+this.xml.toXMLString().replace(/(<use.*?)xlink-href="#/g,'$1xlink:href="#');
		}
	}
	ext.extend({SVG:SVG});
})(extensible);