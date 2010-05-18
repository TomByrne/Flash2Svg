
(function(ext){
	function Que(){
		var args=Array.prototype.slice.call(arguments);
		this.isProcessing=false;
		this.bridge=new BridgeTalk();
		this.bridge.target='flash';
		this.bridge.extensible=extensible;
		ext.Array.apply(this,args);
		this.tempURI=ext.dir+'/.outputpanel';
		if(this.length>0){
			this.process();	
		}
		return this;
	}
	Que.prototype={
		__proto__:ext.Array.prototype,
		type:Que,
		process:function(){
			if(this.length>0){
				this.isProcessing=true;
				var cmd=this.shift();
				this.bridge.body=cmd;
				this.bridge.send(10);
				this.process();
			}else{
				this.isProcessing=false;
			}
		},
		/*
		 * @parameter {Function} callback
		 */
		push:function(callback){
			var startup=this.length<1?true:false;				
			Array.prototype.push.apply(this,arguments);
			if(startup){
				this.process();
			}
		},
		/*
		 * @parameter {Function} callback
		 */
		unshift:function(callback){
			var startup=this.length<1?true:false;	
			Array.prototype.unshift.apply(this,arguments);
			if(startup){
				this.process();
			}
		}
	}
	ext.que=new Que();
})(extensible);