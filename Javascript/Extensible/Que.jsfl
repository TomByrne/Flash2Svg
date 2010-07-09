(function(ext){
	/**
	 * @this {extensible.Que}
	 * @constructor
	 */
	function Que(){
		var args=Array.prototype.slice.call(arguments);
		ext.Array.apply(this,args);
		this.currentID=0;
		this.currentTask=null;
		this.isPaused=false;
		this.isProcessing=false;
		this.resumeCmd='begin';
		if(this.length>0){
			this.next();
		}
		return this;
	}
	Que.prototype={
		__proto__:ext.Array.prototype,
		type:Que,
		/**
		 * @private
		 */
		next:function(){
			if(this.currentTask){
				this.currentID+=1;
			}
			if(this.length){
				this.currentTask=this.shift();
				if(this.isPaused){
					this.resumeCmd='begin';
				}else{
					var e,success;
					for(var i=0;i<2999;i++){
						try{
							this.currentTask.begin();
							success=true;
							break;
						}catch(e){}
					}
					if(!success){
						ext.warn("extensible.Que.next()\n\t"+e);
						this.kill();
					}		
				}
			}else{
				this.isProcessing=false;
				this.currentTask=null;
			}
			return true;
		},
		/**
		 * @parameter {Function} callback
		 */
		push:function(){
			var args=Array.prototype.slice.call(arguments);
			while(!args[0] instanceof ext.Task){
				args.shift();
			}
			if(!args.length){
				return;	
			}
			if(!this.currentTask){
				this.isProcessing=true;
				this.currentTask=args.shift();
				this.currentTask.qID=this.currentID;
				this.currentTask.que=this;
				this.currentTask.begin();
			}
			for(var i=0;i<args.length;i++){
				if(args[i] instanceof ext.Task){
					args[i].qID=this.currentID+this.length+i+1;
					args[i].que=this;
				}else{
					args.splice(i,1);
					i-=1;
				}
			}
			Array.prototype.push.apply(this,args);	
			return this.currentID+this.length;
		},
		/**
		 * Pauses processing.
		 */
		pause:function(resumeCmd){
			this.isPaused=true;
			this.isProcessing=false;
			this.resumeCmd=resumeCmd||this.resumeCmd;
		},
		/**
		 * Resume processing.
		 * @parameter {String} Optional: The command with which to continue processing 
		 * the current task - 'begin','continue', or 'end'. Usually set by the determining hook.
		 */
		resume:function(resumeCmd){
			resumeCmd=resumeCmd||this.resumeCmd;
			this.isPaused=false;
			if(this.currentTask){
				this.isProcessing=true;
				this.currentTask[resumeCmd]();
			}
		},
		/**
		 * @parameter {Function} callback
		 */
		unshift:function(){
			var args=Array.prototype.slice.call(arguments);
			while(!args[0] instanceof ext.Task){
				args.shift();
			}
			if(!args.length){
				return;	
			}
			if(!this.currentTask){
				this.isProcessing=true;
				this.currentTask=args.shift();
				this.currentTask.qID=this.currentID;
				this.currentTask.que=this;
				this.currentTask.begin();
			}
			for(var i=0;i<args.length;i++){
				if(args[i] instanceof ext.Task){
					args[i].qID=this.currentID+this.length+i+1;
					args[i].que=this;
				}else{
					args[i].splice(i,1);
					i-=1;
				}
			}
			Array.prototype.unshift.apply(this,args);
			return this.currentID+this.length;
		},
		/**
		 * 
		 */
		process:function(){
			this.isProcessing=true;
			if(this.currentTask){
				var success=this.currentTask.process.attempt(this.currentTask);
				if(success){
					this.isProcessing=false;
					return true;
				}else{
					return false;
				}
			}
			this.isProcessing=false;
			return false;
		},
		/**
		 * Kills the current task.
		 * @param {Boolean} force If true, forces progression to the next 
		 * item in the que if [this.currentTask.end()] does not return [true].
		 */
		kill:function(force){
			if(this.currentTask){
				var success=this.currentTask.end.attempt(this.currentTask,[],100);
				if(!success && force){
					return this.next();
				}else{
					return success;
				}
			}
		},
		/**
		 * 
		 */
		killAll:function(force){
			this.clear();
			this.kill(force);
			this.currentID=0;
			this.currentTask=null;
			this.isPaused=false;
			this.isProcessing=false;
			this.resumeCmd='begin';
		},
		/**
		 * Removes a task from the que.
		 * @parameter ids An id, or an array of ids.
		 * @return {Number} The new que length.
		 */
		pull:function(id){
			if(
				this.currentTask &&
				this.currentTask.qID==id
			){
				this.kill();
			}else{
				var index=-1;
				for(var i=0;i<this.length;i++){
					if(this[i].qID==id){
						index=i;
					}	
				}
				if(index>-1){
					this.splice(index,1);
				}
			}
			return this.length;
		},
		ping:function(){
			return true;	
		}
	};
	ext.que=new Que();
})(extensible);