(function(dx){
	function Log(options){
		var settings=new dx.Object({
			url:(
				dx.doc.pathURI?
				dx.doc.pathURI.stripExtension()+"_log.csv":
				null
			),
			append:true
		});
		settings.extend(options);
		if(settings.url && !settings.append){
			FLfile.write(settings.url,'');
		}
		delete settings.append;
		dx.Object.apply(this,[settings]);
		this.timers=new dx.Object({});
		return this;
	}
	Log.prototype={
		__proto__:dx.Object.prototype,
		type:Log,
		append:function(s){
			FLfile.write(this.url,s,'append');
		},
		startTimer:function(options){
			var date=new Date();
			if(typeof(options)=='string'){
				options=new dx.Object({description:options});
			}
			var settings=new dx.Object({
				id:undefined,
				description:undefined
			});
			settings.extend(options);
			if(settings.id!==undefined){
				var t=this.timers[settings.id];
				t.elapsed=date.getTime()-t.startTime+t.elapsed;
			}else{
				settings.id=this.timers.uniqueKey('t');
				var t=new dx.Object({elapsed:0,desciption:''});
			}
			if(settings.description!==undefined){
				t.description=settings.description;
			}
			t.startTime=date.getTime();
			this.timers[settings.id]=t;
			return settings.id;
		},
		stopTimer:function(id){
			var t=this.timers[id];
			if(t){
				var time=t.elapsed;
				if(t.startTime){time+=(new Date()).getTime()-t.startTime;}
				this.append(t.description+','+String(time/1000)+'\n');
			}
		},
		pauseTimer:function(id){
			var t=this.timers[id];
			if(t && t.startTime){
				this.timers[id].elapsed=(new Date()).getTime()-t.startTime+t.elapsed;
				delete this.timers[id].startTime;
			}
		}
	}
	dx.extend({Log:Log});
})(dx)
