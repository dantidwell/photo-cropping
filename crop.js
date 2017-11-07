const src = '/crop.jpeg';

class Cropper { 
  constructor(canvas) { 
    /* width of the crop region "grabber" control */
    this.CropControlWidth = 14;
    
    /* half the width of the crop region "grabber" control */
    this.HalfCropControlWidth = 7;
    
    this.IdentityTransform = { 
      scaleX: 1, 
      skewX: 0, 
      translateX: 0, 
      scaleY: 1, 
      skewY: 0, 
      translateY: 0 
    };

    this.Targets = { 
      CropControl: 'CropControl',
      CropRegion: 'CropRegion', 
      None: 'None'
    };
    this.currentTarget = 'None';

    this.__resetCurrentTransform();
    /**
     * Grab the canvas and rendering context
     */
    this.canvas = canvas;
    if(!this.canvas) { 
      throw 'Canvas not found!';
    }
    if(!this.canvas.getContext)  { 
      throw 'Supplied element is not a <canvas>.'
    }
    
    /* Canvas mouse event handlers */
    this.canvas.addEventListener('mousedown', event => this.__handleMouseDown(event));
    this.canvas.addEventListener('mousemove', event => this.__handleMouseMove(event));
    this.___handleMouseUp = this.__handleMouseUp.bind(this);
  }
  
  static Create(elemOrId, photoSrc, callback) { 
    const c = new Cropper(document.getElementById(elemOrId));

    c.photo = new Image();
  
    c.photo.onload = function(event) {
      const clampedWidth = Math.min(c.photo.width, 600);
      const clampedHeight = clampedWidth * (c.photo.height / c.photo.width);
    
      c.canvas.width = clampedWidth
      c.canvas.height = clampedHeight
      c.canvas.style.width = `${clampedWidth}px`;
      c.canvas.style.height = `${clampedHeight}px`;
    
      c.cropRegion = { 
        x: 10,
        y: 10, 
        width: 300,
        height: 300
      };
  
      c.__render();
  
      callback(c)
    };

    /* start the photo download */
    c.photo.src = photoSrc;   
  }

  __render() {
    const ctx = this.canvas.getContext('2d');
  
    // clear
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
  
    // draw backing photo
    ctx.drawImage(this.photo, 0, 0);
  
    // draw translucent overlay 
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
  
    // apply the current transform and draw target photo and crop region
    ctx.save();
    this.__applyCurrentTransform(ctx);
  
    ctx.drawImage(this.photo, 
      this.cropRegion.x + this.currentTransform.translateX, 
      this.cropRegion.y + this.currentTransform.translateY, 
      this.cropRegion.width*this.currentTransform.scaleX, 
      this.cropRegion.height*this.currentTransform.scaleY,    
      this.cropRegion.x, 
      this.cropRegion.y, 
      this.cropRegion.width*this.currentTransform.scaleX, 
      this.cropRegion.height*this.currentTransform.scaleY,    
    );
  
    // crop region and control
    ctx.fillStyle = 'blue';
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2;  
    
    ctx.strokeRect(
      this.cropRegion.x, 
      this.cropRegion.y, 
      this.cropRegion.width*this.currentTransform.scaleX, 
      this.cropRegion.height*this.currentTransform.scaleY
    ); //crop region
    
    ctx.fillRect(
      (this.cropRegion.x + this.cropRegion.width*this.currentTransform.scaleX) - this.CropControlWidth/2, 
      (this.cropRegion.y + this.cropRegion.height*this.currentTransform.scaleY) - this.HalfCropControlWidth, 
      this.CropControlWidth, 
      this.CropControlWidth
    );
  
    ctx.restore();
  };

  __applyCurrentTransform(ctx) { 
    ctx.setTransform(
      1, //this.currentTransform.scaleX, 
      this.currentTransform.skewY,
      this.currentTransform.skewX, 
      1, //this.currentTransform.scaleY,
      this.currentTransform.translateX, 
      this.currentTransform.translateY
    );
  };

  __resetCurrentTransform() { 
    this.currentTransform = Object.assign({}, this.IdentityTransform);
  };

  __getRelativeCursor(mouseEvent) { 
    return { 
      x: mouseEvent.offsetX,
      y: mouseEvent.offsetY
    };
  };

  __pointIsInCropRegion(point) {
    return point.x >= this.cropRegion.x 
      && point.x <= (this.cropRegion.x+this.cropRegion.width) 
      && point.y >= this.cropRegion.y 
      && point.y <= (this.cropRegion.y+this.cropRegion.height);
  };
  
  __pointIsInCropControl(point) { 
    return point.x >= ((this.cropRegion.x+this.cropRegion.width) - this.CropControlWidth/2)
      &&   point.x <= ((this.cropRegion.x+this.cropRegion.width) + this.CropControlWidth/2) 
      &&   point.y >= ((this.cropRegion.y+this.cropRegion.height) - this.CropControlWidth/2) 
      &&   point.y <= ((this.cropRegion.y+this.cropRegion.height) + this.CropControlWidth/2);
  };

  __transformPoint(point) { 
    if(!this.currentTransform) { 
      return { x: point.x, y: point.y };
    }
    const t = this.currentTransform;
    return { 
      x: point.x*t.scaleX + point.y*t.skewY + t.translateX,
      y: point.x*t.skewX + point.y*t.scaleY + t.translateY
    };
  };

  __handleMouseMove(event) { 
    const point = this.__getRelativeCursor(event);
    
    if(this.__pointIsInCropControl(point)) { 
      this.canvas.style.cursor = 'pointer';
    } else if(this.__pointIsInCropRegion(point)) { 
      this.canvas.style.cursor = 'move';
    } else { 
      this.canvas.style.cursor = 'auto';
    }
  
    if(this.currentTarget === this.Targets.None) { 
      return;
    }
    /* update canvas based on current target, if any */
    const deltaX = point.x - this.currentTransform.anchor.x;
    const deltaY = point.y - this.currentTransform.anchor.y;
    
    const scaleXY = Math.max(
      (1 + (deltaX / this.cropRegion.width)), 
      (1 + (deltaY / this.cropRegion.height)), 
      0.10
    ); 
  
    switch(this.currentTarget) { 
      case this.Targets.CropRegion:
        /* TODO: translate the crop region */
        this.currentTransform.translateX = deltaX;
        this.currentTransform.translateY = deltaY;
        this.__render();
        break;
      case this.Targets.CropControl: 
        this.currentTransform.scaleX = scaleXY;
        this.currentTransform.scaleY = scaleXY;
        this.__render();
      default: 
        break;
    }
  };

  __handleMouseDown(event) { 
    const point = this.__getRelativeCursor(event);
  
    if(this.__pointIsInCropControl(point)) { 
      this.currentTarget = this.Targets.CropControl;
    } else if(this.__pointIsInCropRegion(point)) { 
      this.currentTarget = this.Targets.CropRegion;
    } else { 
      this.currentTarget = this.Targets.None;
    }
  
    this.currentTransform.anchor = point;
    document.addEventListener('mouseup', this.___handleMouseUp);
  };

  __handleMouseUp(event) { 
    this.currentTarget = this.Targets.None;
  
    const cropRegionAnchor = { 
      x: this.cropRegion.x + this.currentTransform.translateX, 
      y: this.cropRegion.y + this.currentTransform.translateY  
    };
  
    const cropRegionSpan = this.__transformPoint({
      x: this.cropRegion.x+this.cropRegion.width, 
      y: this.cropRegion.y+this.cropRegion.height
    });
    
    this.cropRegion.x = cropRegionAnchor.x;
    this.cropRegion.y = cropRegionAnchor.y;
    this.cropRegion.width = cropRegionSpan.x - cropRegionAnchor.x;
    this.cropRegion.height = cropRegionSpan.y - cropRegionAnchor.y;
  
    /* reset the current transform */
    this.__resetCurrentTransform();
    this.__render();

    this.onCropRegionChange && this.onCropRegionChange(Object.assign({}, this.cropRegion));

    document.removeEventListener('mouseup', this.___handleMouseUp);
  };
}

let test = null;
Cropper.Create('photo-canvas', '/crop.jpeg', function(_test) { 
  test = _test; 
});
