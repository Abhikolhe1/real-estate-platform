import ezdxf

def create_line(msp, x1, y1, x2, y2, layer):
    msp.add_line((x1, y1), (x2, y2), dxfattribs={'layer': layer})

def create_rect_walls(msp, x, y, width, height, layer='WALLS'):
    # Segmented walls for graph room detection
    create_line(msp, x, y, x + width, y, layer)
    create_line(msp, x + width, y, x + width, y + height, layer)
    create_line(msp, x + width, y + height, x, y + height, layer)
    create_line(msp, x, y + height, x, y, layer)

def create_text(msp, text, x, y, layer='LABELS'):
    msp.add_text(text, dxfattribs={'layer': layer, 'height': 0.6}).set_placement((x, y))

def generate_multi_flat_blueprint(filename="test_tower_10_floors.dxf"):
    doc = ezdxf.new('R2010')
    doc.layers.new('WALLS', dxfattribs={'color': 7})
    doc.layers.new('DOORS', dxfattribs={'color': 1})
    doc.layers.new('WINDOWS', dxfattribs={'color': 3})
    doc.layers.new('LABELS', dxfattribs={'color': 2})
    
    msp = doc.modelspace()

    # =========================================================================
    # CENTRAL ELEVATOR & ACCESS LOBBY (y = 0 to y = 4, x = -16 to x = 16)
    # =========================================================================
    create_line(msp, -16, 0, 16, 0, 'WALLS')
    create_line(msp, -16, 4, 16, 4, 'WALLS')
    create_line(msp, -16, 0, -16, 4, 'WALLS')
    create_line(msp, 16, 0, 16, 4, 'WALLS')
    create_text(msp, 'Elevator Lobby & Corridor', 0, 2, 'LABELS')

    # Central Core Elevators & Fire Staircase
    create_line(msp, -4, 0, -4, -4, 'WALLS')
    create_line(msp, 4, 0, 4, -4, 'WALLS')
    create_line(msp, -4, -4, 4, -4, 'WALLS')
    create_line(msp, 0, 0, 0, -4, 'WALLS')
    create_text(msp, 'Elevator 1', -2, -2, 'LABELS')
    create_text(msp, 'Elevator 2', 2, -2, 'LABELS')

    # =========================================================================
    # UNIT 1: FLAT A - 2 BHK (South-West Wing: x = -16 to -4, y = -14 to 0)
    # Dimensions: 12m width x 14m depth
    # =========================================================================
    # Outer boundaries
    create_line(msp, -16, 0, -4, 0, 'WALLS')
    create_line(msp, -4, 0, -4, -14, 'WALLS')
    create_line(msp, -4, -14, -16, -14, 'WALLS')
    create_line(msp, -16, -14, -16, 0, 'WALLS')

    # Partitions: Living Room (x: -16 to -4, y: -6 to 0)
    create_line(msp, -16, -6, -4, -6, 'WALLS')
    create_text(msp, 'Flat 101 (2BHK) - Living & Dining', -10, -3, 'LABELS')
    # Entrance door from lobby
    create_line(msp, -10, 0, -9, 0, 'DOORS')
    # Living window
    create_line(msp, -16, -2, -16, -4, 'WINDOWS')

    # Kitchen (x: -16 to -10, y: -11 to -6)
    create_line(msp, -10, -6, -10, -11, 'WALLS')
    create_line(msp, -16, -11, -10, -11, 'WALLS')
    create_text(msp, 'Flat 101 - Modular Kitchen', -13, -8.5, 'LABELS')
    create_line(msp, -10, -7, -10, -8, 'DOORS')
    create_line(msp, -16, -8, -16, -10, 'WINDOWS')

    # Master Bedroom (x: -10 to -4, y: -11 to -6)
    create_text(msp, 'Flat 101 - Master Bedroom', -7, -8.5, 'LABELS')
    create_line(msp, -7, -6, -6, -6, 'DOORS')
    create_line(msp, -4, -7, -4, -9, 'WINDOWS')

    # Kids/Guest Bedroom (x: -16 to -10, y: -14 to -11)
    create_text(msp, 'Flat 101 - Bedroom 2', -13, -12.5, 'LABELS')
    create_line(msp, -13, -11, -12, -11, 'DOORS')

    # Bathroom (x: -10 to -4, y: -14 to -11)
    create_line(msp, -10, -11, -10, -14, 'WALLS')
    create_text(msp, 'Flat 101 - Bathroom', -7, -12.5, 'LABELS')
    create_line(msp, -8, -11, -7, -11, 'DOORS')

    # Balcony (x: -14 to -6, y: -16 to -14)
    create_line(msp, -14, -14, -14, -16, 'WALLS')
    create_line(msp, -14, -16, -6, -16, 'WALLS')
    create_line(msp, -6, -16, -6, -14, 'WALLS')
    create_text(msp, 'Flat 101 - Balcony', -10, -15, 'LABELS')
    create_line(msp, -10, -14, -8.5, -14, 'DOORS')

    # =========================================================================
    # UNIT 2: FLAT B - 3 BHK (North Wing: x = -16 to 16, y = 4 to 18)
    # Dimensions: 32m width x 14m depth
    # =========================================================================
    # Outer boundary
    create_line(msp, -16, 4, 16, 4, 'WALLS')
    create_line(msp, 16, 4, 16, 18, 'WALLS')
    create_line(msp, 16, 18, -16, 18, 'WALLS')
    create_line(msp, -16, 18, -16, 4, 'WALLS')

    # Grand Living Hall (x: -8 to 8, y: 4 to 12)
    create_line(msp, -8, 4, -8, 12, 'WALLS')
    create_line(msp, 8, 4, 8, 12, 'WALLS')
    create_line(msp, -8, 12, 8, 12, 'WALLS')
    create_text(msp, 'Flat 102 (3BHK) - Grand Living Hall', 0, 8, 'LABELS')
    # Entrance from central lobby
    create_line(msp, -1, 4, 1, 4, 'DOORS')

    # Formal Dining & Kitchen (x: 8 to 16, y: 4 to 11)
    create_line(msp, 8, 11, 16, 11, 'WALLS')
    create_text(msp, 'Flat 102 - Chef Kitchen & Dining', 12, 7.5, 'LABELS')
    create_line(msp, 8, 6, 8, 7.5, 'DOORS')
    create_line(msp, 16, 6, 16, 8, 'WINDOWS')

    # Master Suite with Bath (x: -16 to -8, y: 4 to 12)
    create_line(msp, -16, 12, -8, 12, 'WALLS')
    create_text(msp, 'Flat 102 - Master Suite', -12, 8, 'LABELS')
    create_line(msp, -8, 7, -8, 8.5, 'DOORS')
    create_line(msp, -16, 6, -16, 9, 'WINDOWS')

    # Bedroom 2 (x: -16 to -4, y: 12 to 18)
    create_line(msp, -4, 12, -4, 18, 'WALLS')
    create_text(msp, 'Flat 102 - Bedroom 2', -10, 15, 'LABELS')
    create_line(msp, -6, 12, -5, 12, 'DOORS')
    create_line(msp, -10, 18, -8, 18, 'WINDOWS')

    # Bedroom 3 / Study (x: 4 to 16, y: 12 to 18)
    create_line(msp, 4, 12, 4, 18, 'WALLS')
    create_text(msp, 'Flat 102 - Bedroom 3', 10, 15, 'LABELS')
    create_line(msp, 5, 12, 6, 12, 'DOORS')
    create_line(msp, 8, 18, 10, 18, 'WINDOWS')

    # Sky Lounge Balcony (x: -4 to 4, y: 12 to 18)
    create_text(msp, 'Flat 102 - Sky View Balcony', 0, 15, 'LABELS')
    create_line(msp, -1.5, 12, 1.5, 12, 'DOORS')
    create_line(msp, -3, 18, 3, 18, 'WINDOWS')

    # =========================================================================
    # UNIT 3: FLAT C - 4 BHK LUXURY (South-East Wing: x = 4 to 16, y = -14 to 0)
    # Dimensions: 12m width x 14m depth
    # =========================================================================
    # Outer boundaries
    create_line(msp, 4, 0, 16, 0, 'WALLS')
    create_line(msp, 16, 0, 16, -14, 'WALLS')
    create_line(msp, 16, -14, 4, -14, 'WALLS')
    create_line(msp, 4, -14, 4, 0, 'WALLS')

    # Living Foyer (x: 4 to 16, y: -6 to 0)
    create_line(msp, 4, -6, 16, -6, 'WALLS')
    create_text(msp, 'Flat 103 (4BHK) - Presidential Living', 10, -3, 'LABELS')
    create_line(msp, 9, 0, 10, 0, 'DOORS')
    create_line(msp, 16, -2, 16, -4, 'WINDOWS')

    # Master Presidential Suite (x: 4 to 10, y: -11 to -6)
    create_line(msp, 10, -6, 10, -11, 'WALLS')
    create_line(msp, 4, -11, 10, -11, 'WALLS')
    create_text(msp, 'Flat 103 - Presidential Suite', 7, -8.5, 'LABELS')
    create_line(msp, 7, -6, 8, -6, 'DOORS')

    # Bedroom 2 (x: 10 to 16, y: -11 to -6)
    create_line(msp, 10, -11, 16, -11, 'WALLS')
    create_text(msp, 'Flat 103 - Guest Suite', 13, -8.5, 'LABELS')
    create_line(msp, 12, -6, 13, -6, 'DOORS')
    create_line(msp, 16, -8, 16, -9.5, 'WINDOWS')

    # Bedroom 3 (x: 4 to 10, y: -14 to -11)
    create_text(msp, 'Flat 103 - Bedroom 3', 7, -12.5, 'LABELS')
    create_line(msp, 7, -11, 8, -11, 'DOORS')

    # Bedroom 4 / Study (x: 10 to 16, y: -14 to -11)
    create_text(msp, 'Flat 103 - Bedroom 4', 13, -12.5, 'LABELS')
    create_line(msp, 12, -11, 13, -11, 'DOORS')
    create_line(msp, 16, -12, 16, -13.5, 'WINDOWS')

    # Panoramic Terrace Balcony (x: 6 to 14, y: -16 to -14)
    create_line(msp, 6, -14, 6, -16, 'WALLS')
    create_line(msp, 6, -16, 14, -16, 'WALLS')
    create_line(msp, 14, -16, 14, -14, 'WALLS')
    create_text(msp, 'Flat 103 - Panoramic Terrace', 10, -15, 'LABELS')
    create_line(msp, 8.5, -14, 10, -14, 'DOORS')

    doc.saveas(filename)
    print(f"Successfully generated high-detail architectural multi-unit blueprint: {filename}")

if __name__ == "__main__":
    generate_multi_flat_blueprint("test_tower_10_floors.dxf")
