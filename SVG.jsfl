(function(ext){
	function SVG(options){
		var settings=new ext.Object({
			precision:3,
			globalStrokeWidths:false, // if true, stroke widths are specified as document-relative widths for Illustrator
			expandSymbols:true, // if true, symbols are converted to graphic elements for compatibility w/ Illustrator & Webkit browsers
			flatten:true,
			degree:3, // determines whether curves are created as Quadratic (2) or Cubic (3) beziers - Quadratic is faster
			masking:'clipping', // determines how masks are applied: 'alpha','clipping',or 'luminance'. Clipping mimicks the way flash displays masks.
			timeline:ext.timeline, // root timeline - defaults to the currently open timeline
			frame:ext.frame, // current frame index - defaults to the current frame
			backgroundColor:ext.doc.backgroundColor,
			backgroundColorKnockout:false, // if true, shapes that match the background color will serve as a knockout group
			includeHiddenLayers:ext.includeHiddenLayers,
			convertStrokesToSymbols:false,
			convertTextToOutlines:true,
			maintainGrouping:true,
			includeGuides:false,
			selection:null, // A ext.Selection object. Limits content to specified elements.
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
		this._defaultGradientLength=819.2;//Pre-transformation length of ALL linear gradients in flash.
		this._defaultGradientRadius=810.7;//Pre-transformation radius of ALL radial gradients in flash.
		this._identityMatrix='matrix(1 0 0 1 0 0)';
		this._symbols=new ext.Array([]);
		this._ids=new ext.Array([]);
		this._tempFolder=ext.lib.uniqueName('temp');
		this.getSVG();
		return this;
	}
	SVG.prototype={
		__proto__:ext.Object,
		type:SVG,
		getSVG:function(){
			if(typeof(this.log)=='string'){
				ext.startLog({url:this.log});
			}
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
				//delete this.xml.defs.symbol;
				if(this.flatten){
					this.applyMatrices(this.xml);
				}
			}
			this.xml['@xmlns']="http://www.w3.org/2000/svg"; // namespace defined after content has been generated for brevity
			if(ext.lib.itemExists(this._tempFolder)){ // cleanup temporary items
				ext.lib.deleteItem(this._tempFolder);	
			}
			fl.showIdleMessage(true);
			ext.sel=origSelection;
			if(typeof(this.log)=='string'){
				ext.stopLog();
			}
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
				var layers=timeline.layers;
				var ranges=new ext.Array();
				for(var i=0;i<layers.length;i++){
					var range=new ext.Array();
					var l=layers[i];
					if(l.frameCount>settings.frame){
						var f=l.frames[settings.frame];
						if(f.tweenType!='none'){
							var start=f.startFrame;
							var end=start+f.duration;
							while(
								l.frames[end] &&
								l.frames[end].tweenType!='none'
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
				id=this.uniqueID(id);
				var instanceID=this.uniqueID(id);
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
					id=this.uniqueID(id);
					if(layer.layerType=='mask'){
						layerXML=new XML('<mask id="'+id+'" />');
						if(this.masking=='alpha'){
							colorX=new ext.Color('#FFFFFF00');  // isolate the alpha channel by tinting the element white 
						}else if(this.masking=='clipping'){
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
				frame:null
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
			for(var i=0;i<contours.length;i++){
				svgArray.push(this.getCountour(contours[i],{
					colorTransform:settings.colorTransform,
					matrix:pathMatrix
				}));
				if(contours[i].interior){
					if(filled.length>0 && contours[i].oppositeFill.style!='noFill' ){
						for(var n=filled.length-1;n>-1;n-=1){
							if(contours[i].oppositeFill.is(contours[filled[n]].fill)){
								if(!contours[i].fill.is(contours[filled[n]].fill)){
									var s=this.getCountour(contours[i],{
										colorTransform:settings.colorTransform,
										reversed:true
									});
									svgArray[filled[n]].path[0]['@d']+=/^[^Zz]*[Zz]?/.exec(s.path[0]['@d'].trim())[0];
									break;
								}
							}
						}
						if(contours[i].fill.style=='noFill'){
							for each(n in svgArray[i].*){
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
			return svg;		
		},
		getCountour:function(contour,options){
			var settings=new ext.Object({
				matrix:null,
				reversed:false,
				colorTransform:null
			});
			settings.extend(options);
			var controlPoints;
			var edges;
			var useCache=false;
			if(contour.cache && contour.cache.controlPoints && contour.cache.controlPoints.length>0){
				useCache=true;
				controlPoints=contour.cache.controlPoints;
				edges=contour.cache.edges;
				if(settings.reversed){
					points=controlPoints.reverse();
					for(var i=0;i<points.length;i++){
						points[i]=points[i].reverse();
					}
					edgs=edges.reverse();
				}
			}else{
				var points=new ext.Array();
				var strokes=new ext.Array();
				var edgs=new ext.Array();
				var edgeIDs=new ext.Array();
				var he=contour.getHalfEdge();
				var used=[];
				var start=he.id;
				var id;
				while(id!=start){//Traverse the contour and acquire control point data.
					var v=he.getVertex();
					var e=he.getEdge();
					if(edgeIDs.indexOf(e.id)<0){
						edgeIDs.push(e.id);
					}else{
						he=he.getNext();
						id=he.id;
						continue;
					}
					var cp;
					if(this.degree==3){
						if(e.isLine){
							cp=new ext.Array([e.getControl(0),e.getControl(2)]);
						}else{
							if(e.cubicSegmentIndex){
								cp=contour.shape.getCubicSegmentPoints(e.cubicSegmentIndex);
							}else{
								var c0=new ext.Point(e.getControl(0));
								var c1=new ext.Point(e.getControl(1));
								var c2=new ext.Point(e.getControl(2));
								if(c0 && c1 && c2){
									cp=new ext.Array([c0,c1,c2]);
								}else{
									var ohe=he.getOppositeHalfEdge();
									if(ohe){
										var ov=ohe.getVertex();
										if(ov){
											cp=new ext.Array([new ext.Point(v),new ext.Point(ov)]);
										}
									}
								}

							}
						}
					}else{
						cp=new ext.Array([e.getControl(0),e.getControl(1),e.getControl(2)]);
					}
					var direction=v.is(e.getHalfEdge(0).getVertex())?0:1;
					if(direction==1){cp=cp.reverse();}
					if(cp.length>0 && (points.length==0 || !cp.is(points[points.length-1]))){				
						points.push(cp);
						edgs.push(e);
					}
					he=he.getNext();
					id=he.id;
				}
				edgeIDs.sort(function(a,b){return(a-b);});
				contour.cache['edgeIDs']=edgeIDs;
				if(points.length==0){return;}
			}
			if(!useCache){// || settings.reversed
				controlPoints=new ext.Array([points[0]]);
				var deg=points[0].length-1;
				var deg0=deg;
				var edges=new ext.Array([edgs[0]]);
				for(var i=1;i<points.length;i++){//Check to make sure that all points are correctly ordered and do not overlap.
					var prevdegree=deg;
					deg=points[i].length-1;
					if(this.degree==3){
						if(
							!points[i][0].is(points[i-1][prevdegree])
						){
							if(
								points[i][deg].is(points[i-1][0])
							){
								points[i-1]=points[i-1].reverse();
								points[i]=points[i].reverse();
							}else if(
								points[i][0].is(points[i-1][0])
							){
								points[i-1]=points[i-1].reverse();
							}else if(
								points[i][deg].is(points[i-1][prevdegree])
							){
								points[i]=points[i].reverse();
							}
							if(points[i-1][prevdegree].indexOfClosestTo(points[i])==deg){
								points[i]=points[i].reverse();
							}
							if(points[i][0].indexOfClosestTo(points[i-1])==0){
								points[i-1]=points[i-1].reverse();
							}
						}
					}
					var overlap=false;
					if(i==points.length-1){
						overlap=true;
						for(var n=0;n<=deg && n<=deg0;n++){
							if(
								(points[i][n].x!=points[0][n].x || points[i][n].y!=points[0][n].y)
							){
								overlap=false;
								break;
							}
						}
					}
					if(!overlap){
						controlPoints.push(points[i]);
						edges.push(edgs[i]);
					}
				}
				contour.cache.controlPoints=controlPoints;
				contour.cache.edges=edges;
			}
			var fills=new ext.Array();
			var paths=new ext.Array();
			var interior=false;
			var xform='';
			if(settings.matrix){
				xform='transform="'+this.getMatrix(settings.matrix)+'" ';
			}
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
				paths.push('<path  '+xform+'fill="'+fillString+'" fill-opacity="'+opacityString+'" d="'+cdata+'"/>\n');
			}
			var hasStroke=false;
			if(edges.length>0 && !settings.reversed){//Create a contour for each length of contiguous edges w/ the same stroke attributes. Skipped for settings.reversed, which is only used for creating hollows.
				var cp=new ext.Array([]);
				var stroke=null;
				if(edges[0].stroke && edges[0].stroke.style!='noStroke'){
					hasStroke=true;
					cp.push(controlPoints[0]);
					stroke=edges[0].stroke;
				}
				for(i=1;i<edges.length;i++){
					if(edges[i].stroke && edges[i].stroke.style!='noStroke'){
						if(stroke!==null && edges[i].stroke.is(stroke)){
							cp.push(controlPoints[i]);
						}else{
							if(stroke && cp.length>0){
								paths.push(
									'<path '+
									xform+
									'fill="none" '+
									this.getStroke(stroke)+
									'd="'+this.getCurve(cp,false)+'" '+
									'/>\n'
								);
							}
							stroke=edges[i].stroke;
							cp=new ext.Array([controlPoints[i]]);
						}
					}else{
						if(stroke && cp.length>0){
							paths.push(
								'<path '+
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
						edges[0].stroke && edges[0].stroke.style!='noStroke' && stroke.is(edges[0].stroke)
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
						paths.push(
							'<path '+
							xform+
							'fill="none" '+
							this.getStroke(stroke)+
							'd="'+this.getCurve(cp,(contour.interior && paths.length<2))+'" '+
							'/>\n'
						);
					}
				}
			}
			var xml
			if(
				this.convertStrokesToSymbols &&
				hasStroke
			){
				xml=new XML('<g/>');
				var use=new XML('<use '+xform+'/>');
				var symbol=new XML('<symbol/>');
				var id=this.uniqueID('path');
				symbol['@id']=id;
				var vb=[
					contour.shape.objectSpaceBounds.left,
					contour.shape.objectSpaceBounds.top,
					contour.shape.objectSpaceBounds.right-contour.shape.objectSpaceBounds.left,
					contour.shape.objectSpaceBounds.bottom-contour.shape.objectSpaceBounds.top
				];
				use['@xlink-href']='#'+id;
				use['@width']=vb[3];
				use['@height']=vb[4];
				use['@x']=vb[0];
				use['@y']=vb[1];
				symbol['@viewBox']=vb.join(' ');
				symbol['@overflow']='visible';
				for(var i=0;i<paths.length;i++){
					if(paths[i]['@transform']){
						delete 	paths[i]['@transform'];
					}
					symbol.appendChild(new XML(paths[i]));
				}
				xml.appendChild(use);
				this.xml.defs.appendChild(symbol);
			}else{
				xml=new XML('<g/>');
				for(var i=0;i<paths.length;i++){
					xml.appendChild(new XML(paths[i]));
				}
			}
			return(xml);
		},
		getCurve:function(controlPoints,close){
			close=close!==undefined?close:true;
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
				if(deg!=prevdeg){curveString.push(degPrefix[deg]);}
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
			id=this.uniqueID(fillObj.style);
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
					var p0=new ext.Point();
					var p1=new ext.Point({x:0,y:0});
					var p2=new ext.Point();
					var unitID='';
					if(settings.gradientUnits=='objectBoundingBox'){
						unitID='%';
						p2.x=((defaultMeasurement)/width)*100;
						p2.y=0;
					}else{
						p2.x=defaultMeasurement;
						p2.y=0;
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
					while(ext.sel.length==0){
						ext.doc.exitEditMode();
						ext.sel=[parentGroups[0]];
					}
					for(var i=0;i<parentGroups.length;i++){
						ext.doc.breakApart();
					}
					ext.doc.selectNone()
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
								if(gradient.name()=='radialGradient'){
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
									fp=fp.transform(mx).roundTo(this.precision);
									cp=cp.transform(mx).roundTo(this.precision);
									rp=rp.transform(mx).roundTo(this.precision);
									gmx=mx.invert().concat(gmx).roundTo(this.precision);
									gradient['@r']=String(Math.roundTo(cp.distanceTo(rp),this.precision));
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
									p1=p1.transform(nmx).roundTo(this.precision);
									p2=p2.transform(nmx).roundTo(this.precision);
									gradient['@x1']=String(p1.x);
									gradient['@y1']=String(p1.y);
									gradient['@x2']=String(p2.x);
									gradient['@y2']=String(p2.y);
								}
							}
						}	
						if(child.hasOwnProperty('@d')){
							var curveData=String(child['@d']);
							var points=curveData.match(/[A-Ya-y]?[\d\.\-]*[\d\.\-][\s\,]*[\d\.\-]*[\d\.\-][Zz]?/g);
							var newPoints=new ext.Array([]);
							for(var i=0;i<points.length;i++){
								if(points[i].trim()==''){continue;}
								var point=new ext.Point(points[i]);
								point=point.transform(nmx).roundTo(this.precision);
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
						if(child.hasOwnProperty('@stroke-width')){
							child['@stroke-width']=Math.roundTo(Number(child['@stroke-width'])*((nmx.scaleX+nmx.scaleY)/2),this.precision);
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
					use['@id']=this.uniqueID(String(symbol['@id']));
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
					use['@id']=this.uniqueID(String(symbol['@id']));
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
			if(this._ids.indexOf(svgID)>-1){
				return true;
			}
			/*
			xml=xml||this.xml;
			for each(id in xml..@id){
				if(id==svgID){
					return true;
				}
			}
			*/
			return false;
		},
		uniqueID:function(svgID,xml){
			svgID=svgID.trim().camelCase();
			if(!svgID.length){svgID='g';}
			if(/^[^A-Za-z]/.test(svgID)){svgID='g'+svgID;}
			if(this.idExists(svgID,xml)){
				if(/\_[\d]*?$/.test(svgID)){
					return this.uniqueID(svgID.replace(/[\d]*?$/,String(Number(/[\d]*?$/.exec(svgID)[0])+1)));
				}else{
					return  this.uniqueID(svgID+"_1");
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