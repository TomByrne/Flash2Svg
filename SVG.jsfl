(function(dx){
	function SVG(options){
		var settings=new dx.Object({
			frame:dx.frame,
			selection:null,
			degree:2,
			includeHiddenLayers:dx.includeHiddenLayers,
			baseProfile:'basic',
			version:'1.1',
			x:0,y:0,
			width:dx.doc.width,
			height:dx.doc.height,
			id:String(dx.doc.name.stripExtension().camelCase()),
			timeline:null,
			docString:'',
			includeGuides:false,
			masking:'alpha', //'alpha','clipping',or 'luminance'
			enterEditMode:false,
			docString:'<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n'
		});
		settings.extend(options);
		dx.Object.apply(this,[settings]);
		this.library=new dx.Object({});
		this.getSVG();
		return this;
	}
	SVG.prototype={
		__proto__:dx.Object,
		type:SVG,
		getTimeline:function(timeline,options){
			var settings=new dx.Object({
				frame:0,
				selection:null,
				id:null,
				matrix:null,
				libraryItem:null,
				color:null,
				enterEditMode:this.enterEditMode
			});
			settings.extend(options);
			if(settings.color){settings.color=new dx.Color(settings.color);}
			var fast=true;
			if(!settings.selection){
				settings.selection=timeline.getElements({
					frame:settings.frame,
					includeHiddenLayers:this.includeHiddenLayers,
					includeGuides:this.includeGuides
				});
				var names=new dx.Array();
				var layers=timeline.layers;
				for(var i=0;i<layers.length;i++){
					if(
						(this.includeHiddenLayers || layers[i].visible) &&
						(this.includeGuides || layers[i].layerType!='guide')
					){//if there are 2 layers with the same name, perform more thorough matching
						var n=layers[i].name;
						if(names.indexOf(n)){
							fast=false;
							break;
						}
						names.push(n);
					}
				}
			}
			var selection=settings.selection.byFrame(fast);
			var xml;
			if(settings.libraryItem){
				var id=settings.libraryItem.name.replace('/','_').camelCase();
				if(settings.frame!=0){
					id+='_'+String(settings.frame);
				}
				if(settings.color){
					id+='_'+settings.color.idString;
				}
				if(this.idExists(id)){
					xml=new XML('<use xlink:href="#'+id+'"/>');
					selection.clear();
				}else{
					xml=new XML('<g/>');
					xml['@id']=id;
				}
			}else{
				xml=new XML('<g/>');
			}
			if(settings.matrix && !settings.matrix.is(new dx.Matrix())){
				xml['@transform']=(
					'matrix('+settings.matrix.a+' '+
					settings.matrix.b+' '+
					settings.matrix.c+' '+
					settings.matrix.d+' '+
					settings.matrix.tx+' '+
					settings.matrix.ty+')'
				);
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
						//delay symbol xml by creating element group,
						//then using it's id as a key for an argument
						//array (timeline,options) for passing to a symbol generator list
						//then loop through after timeline is created passing each to getTimeline
						var element=this.getElement(selection[i][n],{
							colorTransform:colorX,
							frame:settings.frame
							//masking:this.masking,
							//includeHiddenLayers:this.includeHiddenLayers,
							//enterEditMode:this.enterEditMode
						});
						layerXML.appendChild(element);
					}
					if(layer.layerType=='masked'){
						masked.push(layerXML);
					}else{
						xml.appendChild(layerXML);
						if(layer.layerType=='mask'){
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
			return xml;
		},
		getElement:function(element,options){
			if(element.$ instanceof Shape){
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
			if(instance.firstFrame!=undefined){
				var currentFrame=settings.frame;
				var playPosition=currentFrame-instance.frame.startFrame+instance.firstFrame;
				if(instance.loop=='single frame'){
					settings.frame=instance.firstFrame;
				}else if(instance.loop=='play once'){
					settings.frame=(
						playPosition<timeline.frameCount?
						playPosition:
						timeline.frameCount-1
					);
				}else if(instance.loop=='loop'){
					settings.frame=playPosition-(Math.floor(playPosition/timeline.frameCount)*playPosition);
				}
			}else{
				settings.frame=0;
			}
			var layerLocked=instance.layer.locked;
			if(settings.enterEditMode){
				instance.layer.locked=false;
				dx.sel=[instance];
				while(dx.sel.length==0){
					dx.doc.exitEditMode();
					dx.sel=[instance];
				}
				dx.doc.enterEditMode("inPlace");
			}
			var xml=this.getTimeline(timeline,settings);
			if(settings.enterEditMode){
				dx.doc.exitEditMode();
				instance.layer.locked=layerLocked;
			}
			return xml;
		},
		getBitmapInstance:function(bitmapInstance,options){
			return new XML('<g/>');
		},
		getShape:function(shape,options){
			var settings=new dx.Object({
				matrix:new dx.Matrix(),
				colorTransform:null
			});
			settings.extend(options);
			var matrix=shape.matrix;
			var descendantMatrix=null;
			var pathMatrix=null;
			var layerLocked=shape.layer.locked;
			if(shape.isDrawingObject){
				matrix=shape.matrix.concat(settings.matrix);
			}else if(shape.isGroup){
				if(this.enterEditMode){
					shape.layer.locked=false;
					dx.sel=[shape];
					while(dx.sel.length==0){
						dx.doc.exitEditMode();
						dx.sel=[shape];
					}
					dx.doc.enterEditMode("inPlace");
				}
				matrix=new dx.Matrix({
					a:shape.matrix.a,
					b:shape.matrix.b,
					c:shape.matrix.c,
					d:shape.matrix.d
				});
				var tr=shape.center;
				var offset=tr.difference(tr.transform(matrix));
				matrix=matrix.concat({
					tx:offset.x,
					ty:offset.y
				});
				descendantMatrix=matrix.invert();
				matrix=matrix.concat(settings.matrix);

			}else{
				matrix=fl.Math.concatMatrix(settings.matrix,{
					a:shape.matrix.a,
					b:shape.matrix.b,
					c:shape.matrix.c,
					d:shape.matrix.d,
					tx:0,
					ty:0
				});	
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
									svgArray[filled[n]][0]['@d']+=/^[^Zz]*[Zz]?/.exec(s[0]['@d'].trim())[0];
									break;
								}
							}
						}
						if(contours[i].fill.style=='noFill'){
							for(n=0;n<svgArray[i].length();n++){
								if(svgArray[i][n].stroke.length()==0){
									delete svgArray[i][n];
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
				if(svgArray[i].length()){//eliminate duplicate paths
					for(n in svgArray[i]){
						if(
							svgArray[i][n].localName()=='path' && 
							(!svgArray[i][n]['@stroke'].length() || svgArray[i][n]['@stroke']=='none' || svgArray[i][n]['@stroke']=='') && 
							(!svgArray[i][n]['@fill'].length() || svgArray[i][n]['@fill']=='none' || svgArray[i][n]['@fill']=='')
						){
							delete svgArray[i][n];
						}else if(svgArray[i][n].localName()=='path' && svgArray[i][n]['@stroke'].length()){
							var cs0=String(svgArray[i][n]['@d']).replace(/[^\d\.\,]/g,' ').replace(/([^\s])(\s\s*?)([^\s])/g,'$1 $3').trim();
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
					svg.appendChild(svgArray[i]);
				}
			}
			if(shape.isGroup && !shape.isDrawingObject){
				var g=shape.members;
				for(i=0;i<g.length;i++){
					svg.appendChild(
						this.getElement(g[i],{
							colorTransform:settings.colorTransform,
							matrix:descendantMatrix
						})
					);
				}
				if(this.enterEditMode){
					shape.layer.locked=layerLocked;
					dx.doc.exitEditMode();
				}
			}
			return svg;		
		},
		idExists:function(svgID){
			for(id in this.xml..@id){
				if(id==svgID){
					return true
				}
			}
			return false;
		},
		uniqueID:function(svgID){
			if(this.idExists(svgID)){
				if(/\_[\d]*?$/.test(svgID)){
					return this.uniqueID(svgID.replace(/[\d]*?$/,String(Number(/[\d]*?$/.exec(svgID)[0])+1)));
				}else{
					return  this.uniqueID(svgID+"_1");
				}
			}
			return svgID;
		},
		toString:function(){
			return this.docString+'\n'+this.xml.toXMLString();
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
				var fill='none';
				var opacity='1.0';
				if(contour.fill.style!='noFill'){
					fill=contour.fill.color;
					if(contour.fill.style=='solid'){
						if(settings.colorTransform instanceof dx.Color){
							var c=new dx.Color(contour.fill.color);
							c=c.transform(settings.colorTransform);
							fill=c.hex;
							opacity=c.opacity;
						}
					}else{
					}
				}
				var cdata;
				cdata=this.getCurve(controlPoints,true);
				paths.push('<path  '+xform+'fill="'+fill+'" opacity="'+opacity+'" d="'+cdata+'"/>\n');
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
			var xml=new XMLList();
			for(var i=0;i<paths.length;i++){
				xml+=new XML(paths[i]);
			}
			for(var i=0;i<fills.length;i++){
				xml+=new XML(fills[i]);
			}
			return(xml);
		},
		getCurve:function(controlPoints,close){
			close=close!=undefined?close:true;
			var degPrefix=['M','L','Q','C'];
			var deg=controlPoints[0].length-1;
			var curveString=degPrefix[0]+controlPoints[0][0].x+","+controlPoints[0][0].y+" ";
			if(deg>0){curveString+=degPrefix[deg]+controlPoints[0][1].x+","+controlPoints[0][1].y+" ";}
			if(deg>1){curveString+=controlPoints[0][2].x+","+controlPoints[0][2].y+" ";}
			if(deg>2){curveString+=controlPoints[0][3].x+","+controlPoints[0][3].y+" ";}
			for(var i=1;i<controlPoints.length;i++){
				var prevdeg=deg;
				deg=controlPoints[i].length-1;
				if(deg!=prevdeg){curveString+=degPrefix[deg];}
				for(var n=1;n<=deg;n++){
					curveString+=controlPoints[i][n].x+","+controlPoints[i][n].y+(n==deg?"":" ");
				}
				//if(i==controlPoints.length-1 && close){//  
				if(controlPoints[i][deg].x==controlPoints[0][0].x && controlPoints[i][deg].y==controlPoints[0][0].y && close){
					curveString+='z ';
					break;
				}else{
					curveString+=" ";
				}
			}
			return curveString;
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
		getSVG:function(){
			var origSelection=dx.sel;
			dx.doc.selectNone();
			fl.showIdleMessage(false);
			this.xml=new XML('<svg/>');
			this.xml['@version']=this.version;
			this.xml['@baseProfile']=this.baseProfile;
			this.xml['@xmlns']="http://www.w3.org/2000/svg";
			this.xml['@xmlns:xlink']="http://www.w3.org/1999/xlink";
			this.xml['@x']=String(this.x)+'px';
			this.xml['@y']=String(this.y)+'px';
			this.xml['@width']=String(this.width)+'px';
			this.xml['@height']=String(this.height)+'px';
			this.xml['@viewBox']=String(this.x)+' '+String(this.y)+' '+String(this.width)+' '+String(this.height);
			this.xml['@xml:space']='preserve';
			this.xml.appendChild('<defs/>');
			var x=this.getTimeline(dx.timeline,{
				matrix:dx.viewMatrix,
				frame:dx.frame
			});
			if(dx.viewMatrix.is(new dx.Matrix())){
				for each(var e in x.*){
					this.xml.appendChild(e);
				}
			}else{
				this.xml.appendChild(x);
			}
			fl.showIdleMessage(true);
			dx.sel=origSelection;
			return this.xml;
		}
	}
	dx.extend({SVG:SVG});
})(dx);