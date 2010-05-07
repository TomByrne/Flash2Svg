(function(dx){
	function SVG(options){
		var settings=new dx.Object({
			flatten:true,// If true, symbols are converted to graphic elements for compatibility w/ Webkit browsers & Adobe Illustrator.
			degree:2,// Determines whether curves are created as Quadratic (2) or Cubic (3). Quadratic is faster for large documents.
			masking:'alpha', // Determines how masks are applied: 'alpha','clipping',or 'luminance'. Clipping mimicks the way flash displays masks.
			timeline:dx.timeline, // The base timeline for export. Defaults to the currently open timeline.
			frame:dx.frame, // The index of the frame for which SVG markup will be generated. Defaults to the current frame.
			backgroundColor:dx.doc.backgroundColor, // RGB/Hexadecimal. Defaults to the current background color.
			includeHiddenLayers:dx.includeHiddenLayers,
			includeGuides:false,
			selection:null, // A dx.Selection object. Limits content to specified elements.
			matrix:dx.viewMatrix, // The matrix applied to the root element, defaults to the current viewMatrix.
			id:String(dx.doc.name.stripExtension().camelCase()), // Root element ID.
			x:0,y:0, // Root element registration point.
			width:dx.doc.width, // Document width.
			height:dx.doc.height, // Document height.
			docString:( // DOCTYPE
				'<?xml version="1.0" encoding="utf-8"?>\n'+
				'<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n'
			),
			log:undefined,// URI to write debugging log.
			version:'1.1',// SVG Version.
			defaultMatrixString:'matrix(1 0 0 1 0 0)', 
			defaultGradientLength:819.2,//Pre-transformation length of ALL linear gradients in flash.
			defaultGradientRadius:810.7//Pre-transformation radius of ALL radial gradients in flash.
		});
		settings.extend(options);
		if(typeof(settings.log)=='string'){
			settings.log=new dx.Log({url:settings.log});
			if(!settings.log.url){
				settings.log=null;
			}
		}
		dx.Object.apply(this,[settings]);
		this.symbols=new dx.Array([]);
		this.ids=new dx.Array([]);
		this.tempFolder='';
		this.getSVG();
		return this;
	}
	SVG.prototype={
		__proto__:dx.Object,
		type:SVG,
		getSVG:function(){
			if(this.log){var timer=this.log.startTimer('SVG.getSVG');}
			var origSelection=dx.sel;
			dx.doc.selectNone();
			fl.showIdleMessage(false);
			this.xml=new XML('<svg xmlns:xlink="http://www.w3.org/1999/xlink"/>');
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
			if(this.matrix.is(new dx.Matrix())){
				for each(var e in x.*){
					this.xml.appendChild(e);
				}
			}else{
				this.xml.appendChild(x);
			}
			if(this.flatten){
				this.expandUse(this.xml);
				delete this.xml.defs.symbol;
			}
			this.xml['@xmlns']="http://www.w3.org/2000/svg";
			fl.showIdleMessage(true);
			if(this.log){this.log.stopTimer(timer);}
			dx.sel=origSelection;
			return this.xml;
		},
		createTemporaryTimelines:function(){//breaks apart tweens
			
		},
		getTimeline:function(timeline,options){
			var settings=new dx.Object({
				frame:0,
				selection:null,
				id:null,
				matrix:new dx.Matrix(),
				libraryItem:null,
				color:null
			});
			settings.extend(options);
			if(this.log){
				var timer=this.log.startTimer(
					'SVG.getTimeline('+
					((timeline && timeline.name)?timeline.name:'')+')'
				);
			}
			if(settings.color){settings.color=new dx.Color(settings.color);}
			var fast=false;
			if(!settings.selection){
				settings.selection=timeline.getElements({
					frame:settings.frame,
					includeHiddenLayers:this.includeHiddenLayers,
					includeGuides:this.includeGuides
				});
			}
			var selection=settings.selection.byFrame({stacked:true});
			var xml;
			var instanceXML;
			var boundingBox;
			var transformString=(
				'matrix('+settings.matrix.a+' '+
				settings.matrix.b+' '+
				settings.matrix.c+' '+
				settings.matrix.d+' '+
				settings.matrix.tx+' '+
				settings.matrix.ty+')'
			);
			if(settings.libraryItem){
				var id=settings.libraryItem.name.replace('/','_').camelCase();
				if(settings.frame!=0){
					id+='_'+String(settings.frame);
				}
				if(settings.color){
					id+='_'+settings.color.idString;
				}
				id=this.uniqueID(id);
				xml=new XML('<use xlink-href="#'+id+'"/>');
				if(this.symbols.indexOf(id)<0){
					instanceXML=xml;
					instanceXML['@width']=0;
					instanceXML['@height']=0;
					instanceXML['@x']=0;
					instanceXML['@y']=0;
					instanceXML['@transform']=transformString;
					instanceXML['@overflow']="visible";
					this.symbols.push(id);
					xml=new XML('<symbol/>');
					xml['@id']=id;
					boundingBox=new dx.Object({left:0,top:0,right:0,bottom:0});
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
				if(settings.matrix && !settings.matrix.is(new dx.Matrix())){
					xml['@transform']=transformString;
				}
			}
			var masked=new dx.Array();
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
							colorX=new dx.Color('#FFFFFF00');
						}else if(this.masking=='clipping'){
							colorX=new dx.Color('#FFFFFFFF');
						}
					}else if(layer.layerType=='masked'){
						layerXML=new XML('<g id="'+id+'" />');
					}else{
						layerXML=new XML('<g id="'+id+'" />');
					}
					for(var n=0;n<selection[i].length;n++){
						if(boundingBox){
							if(selection[i][n].left<boundingBox.left){boundingBox.left=selection[i][n].left;}
							if(selection[i][n].top<boundingBox.top){boundingBox.top=selection[i][n].top;}
							if(selection[i][n].right>boundingBox.right){boundingBox.right=selection[i][n].right;}
							if(selection[i][n].bottom>boundingBox.bottom){boundingBox.bottom=selection[i][n].bottom;}
						}
						var element=this.getElement(selection[i][n],{
							colorTransform:colorX,
							frame:settings.frame
						});
						if(element){
							layerXML.appendChild(element);
						}
					}
					if(layer.layerType=='masked'){
						masked.push(layerXML);
					}else if(layerXML){
						xml.appendChild(layerXML);
						if(layer.layerType=='mask'){
							var mg=new XML('<g mask="url(#'+id+')"/>');
							for(var m=0;m<masked.length;m++){
								mg.appendChild(masked[m]);
							}
							if(mg){
								xml.appendChild(mg);
							}
							masked.clear();
						}
					}
					if(layer.visible!=lVisible){layer.visible=lVisible;}
					if(layer.locked!=lLocked){layer.locked=lLocked;}
				}
			}
			if(this.log){
				this.log.stopTimer(timer);
			}
			if(instanceXML){
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
			
			if(element.$ instanceof Shape){
/*
				if(
					this.isOvalObject && 
				){
					return this.getOvalObject(element,options);
				}
*/
				return this.getShape(element,options);
			}else if(element.$ instanceof Instance){
				if(element.instanceType=='symbol'){return this.getSymbolInstance(element,options);}
				if(element.instanceType=='bitmap'){return this.getBitmapInstance(element,options);}
			}
			
		},
		getSymbolInstance:function(instance,options){
			//return;
			var settings=new dx.Object({
				frame:0,
				matrix:new dx.Matrix(),
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
			var settings=new dx.Object({
				matrix:new dx.Matrix(),
				colorTransform:null,
				frame:null
			});
			settings.extend(options);
			var matrix=shape.matrix;
			var descendantMatrix=new dx.Matrix();
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
					pathMatrix=new dx.Matrix({
						tx:-shape.objectSpaceBounds.left,
						ty:-shape.objectSpaceBounds.top}
					);
				}
			}else if(shape.isGroup){
				descendantMatrix=matrix.invert();
				pathMatrix=new dx.Matrix({
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
					pathMatrix=new dx.Matrix({tx:shape.objectSpaceBounds.left,ty:shape.objectSpaceBounds.top});
					pathMatrix=pathMatrix.invert();
				}
			}
			var contours=shape.contours;
			var svgArray=new dx.Array();
			var filled=new dx.Array();
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
			svg['@transform']='matrix('+matrix.a+' '+matrix.b+' '+matrix.c+' '+matrix.d+' '+matrix.tx+' '+matrix.ty+')';
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
			var settings=new dx.Object({
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
				var points=new dx.Array();
				var strokes=new dx.Array();
				var edgs=new dx.Array();
				var edgeIDs=new dx.Array();
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
							cp=new dx.Array([e.getControl(0),e.getControl(2)]);
						}else{
							if(e.cubicSegmentIndex){
								cp=contour.shape.getCubicSegmentPoints(e.cubicSegmentIndex);
							}else{
								var c0=new dx.Point(e.getControl(0));
								var c1=new dx.Point(e.getControl(1));
								var c2=new dx.Point(e.getControl(2));
								if(c0 && c1 && c2){
									cp=new dx.Array([c0,c1,c2]);
								}else{
									var ohe=he.getOppositeHalfEdge();
									if(ohe){
										var ov=ohe.getVertex();
										if(ov){
											cp=new dx.Array([new dx.Point(v),new dx.Point(ov)]);
										}
									}
								}

							}
						}
					}else{
						cp=new dx.Array([e.getControl(0),e.getControl(1),e.getControl(2)]);
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
			if(!useCache || settings.reversed){
				controlPoints=new dx.Array([points[0]]);
				var deg=points[0].length-1;
				var deg0=deg;
				var edges=new dx.Array([edgs[0]]);
				for(var i=1;i<points.length;i++){//Check to make sure that all points are correctly ordered and do not overlap.
					var prevdegree=deg;
					deg=points[i].length-1;
					if(this.degree==3){
						if(!points[i][0].is(points[i-1][prevdegree])){
							if(points[i][0].is(points[i-1][0])){
								points[i-1]=points[i-1].reverse();
							}else if(points[i][deg].is(points[i-1][0])){
								points[i-1]=points[i-1].reverse();
								points[i]=points[i].reverse();
							}
							if(fl.Math.pointDistance(points[i][0],points[i-1][prevdegree])>fl.Math.pointDistance(points[i][deg],points[i-1][prevdegree])){
								points[i]=points[i].reverse();
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
			var fills=new dx.Array();
			var paths=new dx.Array();
			var interior=false;
			var xform='';
			if(settings.matrix){
				xform=(
					'transform="matrix('+
						settings.matrix.a+' '+
						settings.matrix.b+' '+
						settings.matrix.c+' '+
						settings.matrix.d+' '+
						settings.matrix.tx+' '+
						settings.matrix.ty+
					')" '
				);
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
						this.ids.pop();
					}else{
						fills.push(fill);
						fillString='url(#'+String(fill['@id'])+')';
					}
				}
				var cdata;
				cdata=this.getCurve(controlPoints,true);
				paths.push('<path  '+xform+'fill="'+fillString+'" opacity="'+opacityString+'" d="'+cdata+'"/>\n');
			}
			if(edges.length>0 && !settings.reversed){//Create a contour for each length of contiguous edges w/ the same stroke attributes. Skipped for settings.reversed, which is only used for creating hollows.
				var cp=new dx.Array([]);
				var stroke=null;
				if(edges[0].stroke && edges[0].stroke.style!='noStroke'){
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
							cp=new dx.Array([controlPoints[i]]);
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
			var xml=new XML('<g/>');
			for(var i=0;i<fills.length;i++){
				xml.appendChild(fills[i]);
			}
			for(var i=0;i<paths.length;i++){
				xml.appendChild(new XML(paths[i]));
			}
			//fl.trace(xml.toXMLString());
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
			var settings=new dx.Object({
				shape:undefined,
				gradientUnits:'userSpaceOnUse'
				//gradientUnits:'objectBoundingBox'
			});
			settings.extend(options);
			if(typeof fillObj=='string'){
				fillObj=new dx.Fill(fillObj);
			}else if(fillObj.style=='noFill'){
				return;
			}
			id=this.uniqueID(fillObj.style);
			var xml,defaultMeasurement;
			var shape=settings.shape;
			var matrix=fillObj.matrix;
			switch(fillObj.style){
				case 'linearGradient':
					defaultMeasurement=this.defaultGradientLength;
				case 'radialGradient':
					defaultMeasurement=defaultMeasurement||this.defaultGradientRadius;
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
						var c=new dx.Color(fillObj.colorArray[i]);
						stop['@stop-color']=c.hex;
						stop['@stop-opacity']=c.opacity;
						if(i<fillObj.posArray.length){
							stop['@offset']=String((fillObj.posArray[i]/255.0)*100)+'%';
						}
						xml.appendChild(stop);
					}
					var width=shape.objectSpaceBounds.right-shape.objectSpaceBounds.left;
					var height=shape.objectSpaceBounds.bottom-shape.objectSpaceBounds.top;
					var p0=new dx.Point();
					var p1=new dx.Point({x:0,y:0});
					var p2=new dx.Point();
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
							var bias=(fillObj.focalPoint+255)/510;
							var fp=p0.midPoint(p2,bias);
							xml['@r']=String(p1.distanceTo(p2))+unitID;
							xml['@cx']=String(p1.x)+unitID;
							xml['@cy']=String(p1.y)+unitID;
							xml['@fx']=String(fp.x)+unitID;
							xml['@fy']=String(fp.y)+unitID;
							xml['@gradientTransform']=(
								'matrix('+matrix.a+' '+
								matrix.b+' '+
								matrix.c+' '+
								matrix.d+' '+
								matrix.tx+' '+
								matrix.ty+')'
							);
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
					var color=new dx.Color(fillObj.color);
					xml=new XML('<solidColor/>');
					xml['@solid-color']=color.hex;
					xml['@solid-opacity']=color.opacity;
					break;
			}
			xml['@id']=id;
			return xml;
		},
		getStroke:function(stroke,options){
			var color=new dx.Color(stroke.color);
			var svg='';
			//if(stroke.fill && stroke.fill!='noFill'){
				
			//}else{
				svg+='stroke="'+color.hex+'" ';
				svg+='stroke-opacity="'+(color.alpha/255.0)+'" ';
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
		globalizeStrokeWidths:function(xml){
			xml=xml||this.xml;
		},
		expandUse:function(xml){
			xml=xml||this.xml;
			for each(use in xml..use){
				var id=String(use['@xlink-href']).slice(1);
				var symbol=this.expandUse(this.xml.defs.symbol.(@id==id)[0]);
				use.setName('g');
				for each(child in symbol.*){
					use.appendChild(child);	
				}
				use['@id']=this.uniqueID(String(symbol['@id'])+'_instance');
				delete use['@xlink-href'];
				delete use['@width'];
				delete use['@height'];
				delete use['@x'];
				delete use['@y'];
				if(use['@transform']==this.defaultMatrixString){
					delete use['@transform'];
				}
			}
			return xml;
		},
		idExists:function(svgID,xml){
			if(this.ids.indexOf(svgID)>-1){
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
			this.ids.push(svgID);
			return svgID;
		},
		toString:function(){
			return this.docString+'\n'+this.xml.toXMLString().replace('<use xlink-href="#','<use xlink:href="#','g');
		}
	}
	dx.extend({SVG:SVG});
})(dx);