(function(ext){
	function Log(options){
		var settings=new ext.Object({
			url:(
				ext.doc.pathURI?
				ext.doc.pathURI.stripExtension()+"_log.csv":
				null
			),
			append:true
		});
		settings.extend(options);
		if(settings.url && !settings.append){
			FLfile.write(settings.url,'');
		}
		delete settings.append;
		ext.Object.apply(this,[settings]);
		this.timers=new ext.Object({});
		return this;
	}
	Log.prototype={
		__proto__:ext.Object.prototype,
		type:Log,
		append:function(s){
			FLfile.write(this.url,s,'append');
		},
		startTimer:function(id){
			var date=new Date();
			if(id!==undefined && this.timers[id]){
				var t=this.timers[id];
				t.startTime=date.getTime();
			}else{
				id=this.timers.uniqueKey(id);
				var t=new ext.Object({elapsed:0,startTime:date.getTime()});
			}
			this.timers[id]=t;
			return id;
		},
		stopTimer:function(id){
			var t=this.timers[id];
			if(t){
				var time=t.elapsed;
				if(t.startTime){time+=(new Date()).getTime()-t.startTime;}
				this.append(id+','+String(time/1000)+'\n');
				delete(this.timers[id]);
			}
		},
		pauseTimer:function(id){
			var t=this.timers[id];
			if(t && t.startTime){
				this.timers[id].elapsed=(new Date()).getTime()-t.startTime+t.elapsed;
				delete this.timers[id].startTime;
			}
		},
		stop:function(){
			var keys=this.timers.keys;
			for(var k=0;k<keys.length;k++){
				this.stopTimer(keys[k]);
			}
		}
	}
	ext.extend({Log:Log});
})(extensible)
