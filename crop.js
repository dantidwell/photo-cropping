/**
 * Grab the canvas and rendering context
 */
const canvas = document.getElementById("photo-canvas");
if(!canvas) { 
  throw 'Canvas not found!';
}

const ctx = canvas.getContext('2d');

const photo = new Image();

let mouseDragAnchor = { 
  x: 0, 
  y: 0  
};

const cropRegion = { 
  x: 10,
  y: 10, 
  width: 300,
  height: 300
};
const cropControlWidth = 14;

// clickable targets on the canvas
const Targets = { 
  CropControl: 'CropControl',
  CropRegion: 'CropRegion', 
  None: 'None'
};
let currentTarget = Targets.None;

// matrix describing current transform
let currentTransform = null;
function _applyCurrentTransform() { 
  ctx.setTransform(
    currentTransform[0], 
    currentTransform[3],
    currentTransform[1], 
    currentTransform[4],
    currentTransform[2], 
    currentTransform[5]
  );    
};

function _resetCurrentTransform() { 
  currentTransform = [
    1,0,0,
    0,1,0,
    0,0,1
  ];
};
_resetCurrentTransform();

const getRelativeCursor = function(mouseEvent) { 
  return { 
    x: mouseEvent.offsetX,
    y: mouseEvent.offsetY
  };
};

const pointIsInRect = function(point,rect) {
  return point.x >= rect.x 
    && point.x <= (rect.x+rect.width) 
    && point.y >= rect.y 
    && point.y <= (rect.y+rect.height);
};

function transformPoint(point, transform) { 
  return { 
    x: point.x*transform[0] + point.y*transform[1] + transform[2],
    y: point.x*transform[3] + point.y*transform[4] + transform[5]
  };
};

/**
 * Main render function
 */
const render = function() {
  // clear
  ctx.save();
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  // backing photo
  ctx.drawImage(photo, 0, 0);

  // translucent overlay 
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  ctx.save();

  _applyCurrentTransform();

  ctx.drawImage(photo, 
    cropRegion.x + currentTransform[2], 
    cropRegion.y + currentTransform[5], 
    cropRegion.width*currentTransform[0], 
    cropRegion.height*currentTransform[4],    
    cropRegion.x, cropRegion.y, cropRegion.width, cropRegion.height,    
  );

  // crop region and controls
  ctx.strokeStyle = "aqua";
  ctx.lineWidth = 2;  
  
  ctx.strokeRect(cropRegion.x, cropRegion.y, cropRegion.width, cropRegion.height); //crop region
  ctx.strokeRect((cropRegion.x + cropRegion.width) - cropControlWidth/2, (cropRegion.y + cropRegion.height) - cropControlWidth/2, cropControlWidth, cropControlWidth); //bottom-right

  ctx.restore();
}

/* load the photo */
photo.onload = function(event) {
  const clampedWidth = Math.min(photo.width, 600);
  const clampedHeight = clampedWidth * (photo.height / photo.width);

  canvas.width = clampedWidth
  canvas.height = clampedHeight
  canvas.style.width = `${clampedWidth}px`;
  canvas.style.height = `${clampedHeight}px`;

  render();
}

photo.onerror = function() { 
  console.error('Failed to load photo.');
};

photo.src = src;

/**
 * Canvas mouse event handlers
 */

canvas.addEventListener('mousemove', function(event) { 
  const point = getRelativeCursor(event);
  
  if(pointIsInRect(point, cropRegion)) { 
    canvas.style.cursor = 'move';
  } else { 
    canvas.style.cursor = 'auto';
  }

  /* update canvas based on current target, if any */
  const deltaX = point.x - mouseDragAnchor.x;
  const deltaY = point.y - mouseDragAnchor.y;
  
  switch(currentTarget) { 
    case Targets.CropRegion:
      /* TODO: translate the crop region */
      // currentTransform[2] = deltaX;
      // currentTransform[5] = deltaY;
      currentTransform[0] = 1 + (deltaX / cropRegion.width); 
      currentTransform[4] = 1 + (deltaX / cropRegion.width);
      render();
      break; 
    default: 
      break;
  }
});

canvas.addEventListener('mousedown', function(event) { 
  const point = getRelativeCursor(event);

  if(pointIsInRect(point, cropRegion)) { 
    currentTarget = Targets.CropRegion;
  } else { 
    currentTarget = Targets.None;
  }

  mouseDragAnchor = point;
})

canvas.addEventListener('mouseup', function(event) { 
  currentTarget = Targets.None;

  const cropRegionAnchor = transformPoint({ 
    x: cropRegion.x,
    y: cropRegion.y
  }, currentTransform);

  const cropRegionSpan = transformPoint({
    x: cropRegion.x+cropRegion.width, 
    y: cropRegion.y+cropRegion.height
  }, currentTransform);
  
  cropRegion.x = cropRegionAnchor.x;
  cropRegion.y = cropRegionAnchor.y;
  cropRegion.width = cropRegionSpan.x - cropRegionAnchor.x;
  cropRegion.height = cropRegionSpan.y - cropRegionAnchor.y;
  

  /* reset the current transform */
  _resetCurrentTransform();
  render();
});


