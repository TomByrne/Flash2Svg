(function(ext){
	function ExtensibleEdge(edge,options){//extends Edge
		var settings=new ext.Object({
			
		});
		settings.extend(options);
		if(edge instanceof Edge){
			this.$=edge;
		}else if(edge instanceof this.type){
			this.$=edge.$;
		}else{
			this.$=new Edge();
		}
		if(settings.shape instanceof Shape){
			settings.shape=new ext.Shape(settings.shape);
		}
		ext.Object.apply(this,[settings]);
		this.cache=new ext.Object({});
		return this;
	}
	ExtensibleEdge.prototype={
		__proto__:ext.Object.prototype,
		shape:null,
		type:ExtensibleEdge,
		getControl:function(i){
			if(ext.log){
				var timer=ext.log.startTimer('Edge getControl.');	
			}
			var c=new ext.Point(
				this.$.getControl(i),
				{
					shape:this.shape,
					edge:this						
				}
			);
			if(ext.log){
				ext.log.pauseTimer(timer);
			}
			return c;
		},
		getHalfEdge:function(index){
			if(ext.log){
				var timer=ext.log.startTimer('Edge getHalfEdge.');
			}
			var he=new ext.HalfEdge(
				this.$.getHalfEdge(index),
				{
					shape:this.shape,
					edge:this
				}
			);
			if(ext.log){
				ext.log.pauseTimer(timer);
			}
			return he;
		},
		setControl:function(){//index, x, y
			return this.$.setControl.apply(this,arguments);
		},
		splitEdge:function(t){
			return this.$.splitEdge(t);
		},
		get cubicSegmentIndex(){
			if(this._cubicSegmentIndex==null){
				if(ext.log)var timer=ext.log.startTimer('Extensible.Edge.get cubicSegmentIndex');
				this._cubicSegmentIndex = this.$.cubicSegmentIndex;
				if(ext.log)ext.log.pauseTimer(timer);
			}
			return this._cubicSegmentIndex;
		},
		get id(){
			return this.$.id;
		},
		set id(s){
			this.$.id=s;
		},
		get isLine(){
			return this.$.isLine;
		},
		set isLine(s){
			this.$.isLine=s;
		},
		get stroke(){
			if(this.$.stroke){
				return new ext.Stroke(this.$.stroke);
			}else{
				return;
			}
		},
		set stroke(s){
			this.$.stroke=s;
		},
		get fills(){
			if(this.cache.fills){
				return this.cache.fills;	
			}else{
				return this.getFills();
			}
		},
		set fills(s){
			this.cache.fills=s;
		},
		getFills:function(){
			if(this.shape){
				var fills=new ext.Array();
				var id=this.id;
				var contours=this.shape.contours;
				for(var i=0;i<contours.length;i++){
					if(contours[i].edgeIDs.indexOf(id)>-1){
						var fill=contours[i].fill;
						if(fill.style && fill.style!="noFill"){
							fills.push(fill);
						}
						if(fills.length==2){
							break;
						}
					}
				}
				this.cache['fills']=fills;
				return fills;
			}
		},
		is:function(e){
			if(e instanceof Edge){
				e=new ext.Edge(
					e,
					{
						shape:this.shape	
					}
				);
			}else if(!(e instanceof this.type)){
				return;	
			}
			return (this.id==e.id);
			cp0=new ext.Array([this.getControl(0),this.getControl(1),this.getControl(2)]);
			cp1=new ext.Array([e.getControl(0),e.getControl(1),e.getControl(2)]);
			if(!cp0||!cp1){
				cp0=new ext.Array([this.getHalfEdge(0).getVertex(),this.getHalfEdge(1).getVertex()]);
				cp1=new ext.Array([e.getHalfEdge(0).getVertex(),e.getHalfEdge(1).getVertex()]);
			}
			return ( cp0.is(cp1) );
		}
	}
	ext.extend({Edge:ExtensibleEdge});
})(extensible)
