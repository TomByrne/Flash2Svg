(function(ext){
	function ExtensibleHalfEdge(halfedge,options){//extends HalfEdge
		var settings=new ext.Object({
			
		});
		settings.extend(options);
		if(halfedge instanceof HalfEdge){
			this.$=halfedge;
		}else if(halfedge instanceof this.type){
			this.$=halfedge.$;
		}else{
			this.$=new HalfEdge();
		}
		if(settings.shape instanceof Shape){
			settings.shape=new ext.Shape(settings.shape);
		}
		ext.Object.apply(this,[settings]);
		return this;
	}
	ExtensibleHalfEdge.prototype={
		__proto__:ext.Object.prototype,
		type:ExtensibleHalfEdge,
		//built in methods
		get edge(){
			return this.getEdge();
		},
		set edge(){
			return;
		},		
		get vertex(){
			return this.getVertex();
		},
		set vertex(){
			return;
		},
		getEdge:function(){
			if(this._edge==null){
				if(ext.log){
					var timer=ext.log.startTimer('HalfEdge getEdge.');	
				}
				this._edge=new ext.Edge(
					this.$.getEdge(),
					{
						shape:this.shape
					}
				);
				if(ext.log){
					ext.log.pauseTimer(timer);
				}
			}
			return this._edge;
		},
		getNext:function(){
			if(ext.log){
				var timer=ext.log.startTimer('HalfEdge getNext.');
			}
			var e=new ext.HalfEdge(
				this.$.getNext(),
				{
					shape:this.shape
				}
			);
			if(ext.log){
				ext.log.pauseTimer(timer);
			}
			return e;
		},
		getOppositeHalfEdge:function(){
			if(ext.log){
				var timer=ext.log.startTimer('HalfEdge getOppositeHalfEdge.');
			}
			var e=new ext.HalfEdge(
				this.$.getOppositeHalfEdge(),
				{
					shape:this.shape
				}
			);
			if(ext.log){
				ext.log.pauseTimer(timer);
			}
			return e;
		},
		getPrev:function(){
			if(ext.log){
				var timer=ext.log.startTimer('HalfEdge getPrev.');
			}
			var e=new ext.HalfEdge(
				this.$.getPrev(),
				{
					shape:this.shape
				}
			);
			if(ext.log){
				ext.log.pauseTimer(timer);
			}
			return e;
		},
		getVertex:function(){
			if(ext.log){
				var timer=ext.log.startTimer('HalfEdge getVertex.');
			}
			var e=new ext.Vertex(
				this.$.getVertex(),
				{
					shape:this.shape,
					edge:this
				}
			);
			if(ext.log){
				ext.log.pauseTimer(timer);
			}
			return e;
		},
		get id(){
			return this.$.id;
		},
		set id(s){
			this.$.id=s;
		},
		get index(){
			return this.$.index;
		},
		set index(s){
			this.$.index=s;
		}
	}
	ext.extend({HalfEdge:ExtensibleHalfEdge});
})(extensible)
