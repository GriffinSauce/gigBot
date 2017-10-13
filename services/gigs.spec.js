import expect from 'expect';
import { promisify } from 'bluebird';
import gigsService from './gigs';

const stopAsking = promisify(gigsService.stopAsking);

import Gig from '../schemas/gig.js';
import Settings from '../schemas/settings.js';

describe('services/gigs', () => {
  let stoppableGig;
  before(async () => {
    stoppableGig = await Gig.create({
      request: {
        active: true,
      },
    });
  });
  describe('stopAsking', function() {
    it('should stop a gigs request', async function() {
      await stopAsking(stoppableGig._id);
      const gig = await Gig.findById(stoppableGig._id);
      expect(gig.request.active).toBe(false);
    });
    // it('should error for non-existent gigs', async function() {
    //   let error;
    //   try {
    //     await stopAsking('notevenanobjectid');
    //   } catch (e) {
    //     error = e;
    //   }
    //   expect(error.message).toBe('gigNotFound');
    // });
  });
});
