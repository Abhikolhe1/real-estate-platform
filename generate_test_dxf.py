import ezdxf
import math

def create_line(msp, x1, y1, x2, y2, layer):
    msp.add_line((x1, y1), (x2, y2), dxfattribs={'layer': layer})

def create_text(msp, text, x, y, layer):
    msp.add_text(text, dxfattribs={'layer': layer, 'height': 0.5}).set_placement((x, y))

def generate_test_dxf(filename):
    doc = ezdxf.new('R2010')
    doc.layers.new('WALLS', dxfattribs={'color': 7})
    doc.layers.new('DOORS', dxfattribs={'color': 1})
    doc.layers.new('WINDOWS', dxfattribs={'color': 3})
    doc.layers.new('LABELS', dxfattribs={'color': 2})
    
    msp = doc.modelspace()

    # Flat A (1BHK) - 10x10, split at x=5 and y=5
    ax, ay = 0, 0
    # Outer split at intersections
    create_line(msp, 0, 0, 5, 0, 'WALLS')
    create_line(msp, 5, 0, 10, 0, 'WALLS')
    create_line(msp, 10, 0, 10, 5, 'WALLS')
    create_line(msp, 10, 5, 10, 10, 'WALLS')
    create_line(msp, 10, 10, 5, 10, 'WALLS')
    create_line(msp, 5, 10, 0, 10, 'WALLS')
    create_line(msp, 0, 10, 0, 5, 'WALLS')
    create_line(msp, 0, 5, 0, 0, 'WALLS')
    
    # Internals
    create_line(msp, 5, 0, 5, 5, 'WALLS')
    create_line(msp, 5, 5, 5, 10, 'WALLS')
    create_line(msp, 0, 5, 5, 5, 'WALLS')
    
    create_text(msp, 'Bedroom A', 7.5, 5.0, 'LABELS')
    create_text(msp, 'Living Room A', 2.5, 7.5, 'LABELS')
    create_text(msp, 'Kitchen A', 2.5, 2.5, 'LABELS')
    
    # Doors (placed on wall segments)
    create_line(msp, 0, 7, 0, 8, 'DOORS') # Entrance
    create_line(msp, 5, 6, 5, 7, 'DOORS') # Bedroom door
    
    # Windows
    create_line(msp, 2, 10, 4, 10, 'WINDOWS')
    create_line(msp, 10, 4, 10, 6, 'WINDOWS')

    # Flat B (2BHK) - 15x10 (offset bx=20)
    bx, by = 20, 0
    create_line(msp, 20, 0, 25, 0, 'WALLS')
    create_line(msp, 25, 0, 30, 0, 'WALLS')
    create_line(msp, 30, 0, 35, 0, 'WALLS')
    create_line(msp, 35, 0, 35, 5, 'WALLS')
    create_line(msp, 35, 5, 35, 10, 'WALLS')
    create_line(msp, 35, 10, 30, 10, 'WALLS')
    create_line(msp, 30, 10, 25, 10, 'WALLS')
    create_line(msp, 25, 10, 20, 10, 'WALLS')
    create_line(msp, 20, 10, 20, 5, 'WALLS')
    create_line(msp, 20, 5, 20, 0, 'WALLS')
    
    # Internals
    create_line(msp, 25, 0, 25, 5, 'WALLS')
    create_line(msp, 25, 5, 25, 10, 'WALLS')
    create_line(msp, 30, 0, 30, 5, 'WALLS')
    create_line(msp, 30, 5, 30, 10, 'WALLS')
    create_line(msp, 25, 5, 30, 5, 'WALLS')
    create_line(msp, 30, 5, 35, 5, 'WALLS')
    
    create_text(msp, 'Kitchen B', 22.5, 5, 'LABELS')
    create_text(msp, 'Living Room B', 27.5, 7.5, 'LABELS')
    create_text(msp, 'Bedroom B1', 32.5, 7.5, 'LABELS')
    create_text(msp, 'Bedroom B2', 32.5, 2.5, 'LABELS')

    doc.saveas(filename)
    print(f"Generated {filename}")

if __name__ == "__main__":
    generate_test_dxf("test_tower_10_floors.dxf")
