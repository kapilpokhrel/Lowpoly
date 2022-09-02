from PIL import Image
import numpy as np
from selenium import webdriver

class LowPoly:
    def __init__(self, filename) -> None:
        #Open image as numpy array
        self.image = Image.open(filename)
        self.grayscale_image = self.image.dot([0.07, 0.72, 0.21]).astype("uint8")

    def generate_max_entropy_points(n_points):
        pass

    def generate_triangles():
        pass


def draw_triangles_in_desmos(lowpoly, browser):
    pass

if __name__=="__main__":

    lowpoly = LowPoly('image.png');

    # Initializing Selenium for opening desmos
    browser = webdriver.Chrome()
    browser.get("https://desmos.com/calculator")

    #Generate Triangles
    lowpoly.generate_max_entropy_points()
    lowpoly.generate_triangles()

    draw_triangles_in_desmos(lowpoly, browser=browser)


    
