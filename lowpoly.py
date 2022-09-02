from PIL import Image
import numpy as np
from selenium import webdriver
from skimage import filters, morphology

class LowPoly:
    def __init__(self, filename) -> None:
        #Open image as numpy array
        self.image = np.array(Image.open(filename))
        self.grayscale_image = self.image.dot([0.07, 0.72, 0.21]).astype("uint8")
        self.shape = self.grayscale_image.shape

    def __get_max_points(self, array):
        y, x = np.unravel_index(np.argmax(array), array.shape)
        return x,y

    def __gaussian_mask(self, x, y, shape, amplitude, sd):
        '''
            Return gaussian mask of given shape centered around x, y cordinate
        '''
        xv, yv = np.meshgrid(np.arange(shape[1]), np.arange(shape[0]))
        mask = amplitude * np.exp(-((xv - x) ** 2 + (yv - y) ** 2) / (2 * sd ** 2))
        return mask

    def generate_max_entropy_points(self, n_points):
        height, width = self.shape[:2]
        length_scale = np.sqrt(width*height / n_points)
        entropy_radius = length_scale*0.15;
        gmask_aplitude = 3
        gmask_sd = length_scale * 0.3;
        
        #Appllying entropy filter
        filtered_image = filters.rank.entropy(self.grayscale_image, morphology.disk(entropy_radius));

        points = []
        for i in range(n_points):
            x, y = self.__get_max_points(filtered_image)
            points.append((x,y))
            filtered_image -= self.__gaussian_mask(x, y, self.shape, gmask_aplitude, gmask_sd)

        #Adding cornor points
        points.append((0,0))
        points.append((width-1, 0))
        points.append((0,height-1))
        points.append((width-1,height-1))
        self.points = np.array(points)
            

    def generate_triangles(self):
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


    
