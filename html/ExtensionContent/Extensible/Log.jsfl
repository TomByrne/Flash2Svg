(function(ext){
	function Log(options){
		if(options && typeof(options)=='string'){
			options={url:options};	
		}
		var settings=new ext.Object({
			url:(
				ext.doc.pathURI?
				ext.doc.pathURI.stripExtension()+"_log.csv":
				null
			),
			append:false
		});
		settings.extend(options);
		if(settings.url && !settings.append){
			FLfile.write(settings.url,'Operation,Total Time,Average Time,Run Count\n');
		}
		delete settings.append;
		ext.Object.apply(this,[settings]);
		this.timers=new ext.Object({});
		return this;
	}

	var zeroPad = function(str, length){
		while(str.length < length){
			str = "0"+str;
		}
		return str;
	}

	var convertTime = function(ms){
		var secs = ms / 1000;
		var mins = Math.floor(secs / 60);
		secs = Math.round(secs - mins*60);
		return zeroPad(String(mins), 2) + "m " + zeroPad(String(secs), 2) + "s"
	}

	Log.prototype={
		__proto__:ext.Object.prototype,
		type:Log,
		append:function(s){
			FLfile.write(this.url,s,'append');
		},
		pauseTimer:function(id){
			var t=this.timers[id];
			if(t && t.startTime){
				this.timers[id].elapsed=(new Date()).getTime()-t.startTime+t.elapsed;
				this.timers[id].runs+=1;
				delete this.timers[id].startTime;
			}
		},
		startTimer:function(id){
			var date=new Date();
			if(id!==undefined && this.timers[id]){
				var t=this.timers[id];
				t.startTime=date.getTime();
			}else{
				id=this.timers.uniqueKey(id);
				var t=new ext.Object({elapsed:0,startTime:date.getTime(),runs:1});
			}
			this.timers[id]=t;
			return id;
		},
		stop:function(){
			var keys=this.timers.keys;
			for(var k=0;k<keys.length;k++){
				this.stopTimer(keys[k]);
			}
		},
		stopTimer:function(id){
			var t=this.timers[id];
			if(t){
				var time=t.elapsed;
				var runs=t.runs;
				if(t.startTime){time+=(new Date()).getTime()-t.startTime;}
				this.append(id+','+convertTime(time)+','+convertTime(time/runs)+','+String(runs)+'\n');
				delete(this.timers[id]);
			}
		}
	}
	ext.extend({Log:Log});
})(extensible)
