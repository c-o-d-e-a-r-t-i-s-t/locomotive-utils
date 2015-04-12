var locomotive = require('locomotive')
	, Controller = locomotive.Controller;

var JSONResp = require('./JSONResp.js').JSONResp;

var PRMZ = function(){
	var p = {
		yesfn: undefined,
		yesobj: undefined,
		nofn: undefined,
		noobj: undefined,
		p2: undefined,
		resolve: function(obj){
			p.yesobj = obj;
			if(typeof p.yesfn == "function") {
				var rt = p.yesfn(p.yesobj);
				if(p.p2) p.p2.resolve(rt);
			}
		},
		reject: function(obj){
			p.noobj = obj;
			if(typeof p.nofn == "function") {
				var rt = p.nofn(p.noobj);
				if(p.p2 && rt) p.p2.reject(rt);
			}
		},
		promise: {
			then: function(gf, bf){
				p.p2 = PRMZ();
				p.yesfn = gf;
				p.nofn = bf;
				if(p.yesobj && typeof p.yesfn=="function") {
					var rt = p.yesfn(p.yesobj);
					if(rt){
						p.p2.resolve( rt );
					}
					else p.p2.reject();
				}
				if(p.noobj && typeof p.nofn=="function") {
					var rt = p.nofn(p.noobj);
					p.p2.reject( rt );
				}
				return p.p2.promise;
			}
		}
	};
	return p;
};

module.exports = {

	promise: PRMZ,

	JSONController: function(ctrl){
		var c = ctrl || new Controller();
		var self = c;

		c._dbProm = function(dbobj, dbmeth, parm, errmsg, errcode){
			var p = PRMZ();
			var ags = [];
			if(parm!=undefined) ags.push(parm);
			ags.push(function(err, rt){
				if(err){
					if(errmsg) c.sendError(errmsg, errcode);
					else p.reject(err);
				} else {
					if(rt==null){
						if(errmsg) c.sendError(errmsg, errcode);
						else p.reject(err);
					}
					else p.resolve(rt);
				}
			});
			dbobj[dbmeth].apply(dbobj, ags);
			return p.promise
		};

		c.objById = function(DClass, oid, errmsg, errcode){
			return c._dbProm(DClass, 'findById', oid, errmsg, errcode);
		};

		c.findById = c.objById;

		c.findOne = function(DClass, fltr, errmsg, errcode){
			return c._dbProm(DClass, 'findOne', fltr, errmsg, errcode);
		};

		c.filter = function(DClass, fltr, errmsg, errcode){
			return c._dbProm(DClass, 'find', fltr, errmsg, errcode);
		};

		c.saveObj = function(obj, errmsg, errcode){
			return c._dbProm(obj, 'save', undefined, errmsg, errcode);
		};

		c.sendJSON = function(obj){
			c._jsonresp.send(obj);
		};

		c.sendError = function(error, errcode){
			c._jsonresp.err(error, errcode);
		};

		c.before('*', function(next){
			c._jsonresp = new JSONResp(this.res);
			next();
		});

		c.ensureParam = function(pn, errmsg, errcode){
			var p = PRMZ();
			var pm = this.param(pn);
			if(pm==null){
				if(errmsg) c.sendError(errmsg, errcode);
				else p.reject();
			} else {
				p.resolve(pm);
			}
			return p.promise
		};

		c.ensureParams = function(required){
			var rt=[];
			for(var i=0; required && i<required.length; i++){
				var e = required[i];
				if(this.param(e)==null){
					rt.push(e);
				};
			}
			return rt.length==0?true:rt;
		};

		c.ensureParamsRun = function(required, cb, args){
			var pms = this.ensureParams(required);
			if(pms!=true){
				this.sendError("Parameter(s) '"+pms.join(', ')+"' missing.");
				return;
			}
			if(typeof cb == "function"){
				cb.apply(this, args||[]);
			}
		};

		c.getParams = function(pms){
			var rt = [], self=this;
			pms.forEach(function(pn){
				rt.push(self.param(pn));
			});
			return rt;
		};

		c.jsonOK = function(){
			c.sendJSON({msg: "OK" });
		};

		c._parmfnc = function(dis, arr, abortOnError){
			var ags = [], self=this;
			var abort = abortOnError==undefined?false:abortOnError;
			var fn;
			for(var i=0; i<arr.length; i++){
				if(typeof arr[i]=="function") fn = arr[i]
				else if(typeof arr[i]=="string") {
					var ag = self.param(arr[i]);
					if(ag==undefined && abort==true){
						self.sendError("Parameter '"+arr[i]+"' missing.");
						return;
					} else {
						ags.push(ag);
					}
				}
			}
			if(typeof fn =="function"){
				fn.apply(dis, ags);
			}
		};

		c.runWithParams = function(){
			this._parmfnc(this, arguments, true);
		};

		c.createHandler = function(options){
			var opts = options || {};
			var fn, ens=[], hfn;
			if(opts instanceof Array){
				opts.forEach(function(opt){
					if(typeof opt == "function"){
						hfn = opt;
					} else if(typeof opt == "string"){
						ens.push(opt);
					}
				});
			} else {
				ens = opts.ensure;
				hfn = opts.handler;
				if(opts.name){
					c[opts.name] = fn;
				}
			}
			fn = function(){
				var self = this;
				this.ensureParamsRun(ens, function(){
					var ags = self.getParams(ens);
					hfn.apply(self, ags);
				});
			};
			return fn;
		};

		return c;
	}

};
